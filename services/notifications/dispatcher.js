var getNotificationConfig = require('../../config/notifications').getNotificationConfig;
var createNotificationQueue = require('./queue').createNotificationQueue;

var queueRef = null;

function getQueueOrNull() {
  var config = getNotificationConfig();

  if (!config.redis.url) {
    return null;
  }

  if (!queueRef) {
    queueRef = createNotificationQueue(config);
  }

  return queueRef;
}

async function publishNotification(payload) {
  var queue = getQueueOrNull();

  if (!queue) {
    return {
      ok: false,
      reason: 'redis_not_configured'
    };
  }

  var job = await queue.enqueueNotification(payload);

  return {
    ok: true,
    jobId: job.id
  };
}

function buildBackendErrorPayload(err, req) {
  var config = getNotificationConfig();
  var adminPhone = process.env.ALERT_ADMIN_PHONE_E164 || '';

  if (!adminPhone) {
    return null;
  }

  var method = req && req.method ? req.method : 'UNKNOWN';
  var originalUrl = req && req.originalUrl ? req.originalUrl : 'UNKNOWN';
  var statusCode = err && err.status ? err.status : 500;
  var message = err && err.message ? err.message : 'Unhandled server error';

  return {
    userId: 'system-admin',
    eventType: 'backend_error',
    message: '[Backend Error] ' + method + ' ' + originalUrl + ' -> ' + statusCode + ': ' + message,
    metadata: {
      phoneE164: adminPhone,
      whatsappOptIn: true,
      env: config.env
    },
    idempotencyKey: 'backend-error-' + Date.now()
  };
}

module.exports = {
  publishNotification: publishNotification,
  buildBackendErrorPayload: buildBackendErrorPayload
};
