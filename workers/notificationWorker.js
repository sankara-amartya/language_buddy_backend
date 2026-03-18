var dotenv = require('dotenv');
var Worker = require('bullmq').Worker;
var UnrecoverableError = require('bullmq').UnrecoverableError;
var IORedis = require('ioredis');

var getNotificationConfig = require('../config/notifications').getNotificationConfig;
var validateNotificationConfig = require('../config/notifications').validateNotificationConfig;
var QUEUE_NAME = require('../services/notifications/queue').QUEUE_NAME;
var validateSendNotificationPayload = require('../services/notifications/contracts').validateSendNotificationPayload;
var createWhatsAppProvider = require('../services/notifications/whatsappProvider').createWhatsAppProvider;
var evaluateWhatsAppConsent = require('../services/notifications/consent').evaluateWhatsAppConsent;
var findUserById = require('../services/notifications/userRepository').findUserById;
var deliveryRepository = require('../services/notifications/deliveryRepository');
var log = require('../services/notifications/logger');

dotenv.config();

var config = getNotificationConfig();
validateNotificationConfig(config);

if (!config.redis.url) {
  log.error('notification.worker.config_error', {
    message: 'REDIS_URL is required to run notification worker.'
  });
  process.exit(1);
}

var connection = new IORedis(config.redis.url, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false
});

var provider = createWhatsAppProvider(config);

var worker = new Worker(
  QUEUE_NAME,
  async function(job) {
    var result = validateSendNotificationPayload(job.data);
    if (!result.success) {
      throw new Error('Invalid notification payload: ' + result.error.message);
    }

    var payload = result.data;
    var attempts = job.attemptsMade + 1;
    var queueJobId = String(job.id);
    var userRecord = findUserById(payload.userId);

    log.info('notification.job.processing', {
      queueJobId: queueJobId,
      userId: payload.userId,
      eventType: payload.eventType,
      attempts: attempts
    });

    deliveryRepository.upsertQueued({
      queueJobId: queueJobId,
      eventType: payload.eventType,
      userId: payload.userId,
      destination: userRecord && userRecord.phoneE164 ? userRecord.phoneE164 : null,
      attempts: attempts,
      metadata: payload.metadata || {}
    });

    var consent = evaluateWhatsAppConsent(userRecord);

    if (!consent.allowed) {
      deliveryRepository.markBlocked(queueJobId, consent.reason, attempts);

      return {
        status: 'blocked',
        reason: consent.reason
      };
    }

    var sendResult = await provider.sendWhatsAppText(userRecord.phoneE164, payload.message);

    if (!sendResult.ok) {
      deliveryRepository.markFailed(
        queueJobId,
        sendResult.errorType || 'provider_error',
        sendResult.message || 'Provider send failed',
        attempts
      );

      log.error('notification.job.provider_failed', {
        queueJobId: queueJobId,
        userId: payload.userId,
        eventType: payload.eventType,
        errorType: sendResult.errorType,
        statusCode: sendResult.statusCode,
        message: sendResult.message
      });

      if (sendResult.errorType === 'auth' || sendResult.errorType === 'permanent') {
        throw new UnrecoverableError('Provider send non-retryable: ' + (sendResult.message || sendResult.errorType));
      }

      throw new Error('Provider send failed: ' + (sendResult.message || sendResult.errorType));
    }

    deliveryRepository.markSent(queueJobId, sendResult.messageId, attempts);

    return {
      status: 'sent',
      providerMessageId: sendResult.messageId
    };
  },
  {
    connection: connection,
    concurrency: 5,
    limiter: {
      max: config.behavior.queueRateLimitMax,
      duration: config.behavior.queueRateLimitDurationMs
    }
  }
);

worker.on('completed', function(job, returnValue) {
  log.info('notification.job.completed', {
    queueJobId: job ? String(job.id) : null,
    result: returnValue
  });
});

worker.on('failed', function(job, err) {
  log.error('notification.job.failed', {
    queueJobId: job ? String(job.id) : 'unknown',
    error: err ? err.message : 'unknown'
  });
});

log.info('notification.worker.started', {
  queueName: QUEUE_NAME,
  concurrency: 5
});

process.on('SIGINT', async function() {
  await worker.close();
  await connection.quit();
  process.exit(0);
});

process.on('SIGTERM', async function() {
  await worker.close();
  await connection.quit();
  process.exit(0);
});
