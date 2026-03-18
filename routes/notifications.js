var express = require('express');
var rateLimit = require('express-rate-limit');

var notificationAuth = require('../middleware/notificationAuth');
var getNotificationConfig = require('../config/notifications').getNotificationConfig;
var validateSendNotificationPayload = require('../services/notifications/contracts').validateSendNotificationPayload;
var createNotificationQueue = require('../services/notifications/queue').createNotificationQueue;
var getByQueueJobId = require('../services/notifications/deliveryRepository').getByQueueJobId;
var log = require('../services/notifications/logger');

var router = express.Router();
var config = getNotificationConfig();
var notificationQueue = null;

function getQueue() {
  if (!config.redis.url) {
    return null;
  }

  if (!notificationQueue) {
    notificationQueue = createNotificationQueue(config);
  }

  return notificationQueue;
}

var sendLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false
});

router.post('/send', notificationAuth, sendLimiter, async function(req, res) {
  var validation = validateSendNotificationPayload(req.body);

  if (!validation.success) {
    return res.status(400).json({
      error: 'invalid_payload',
      details: validation.error.issues,
      requestId: req.requestId || null
    });
  }

  try {
    var queue = getQueue();

    if (!queue) {
      return res.status(500).json({
        error: 'redis_not_configured',
        message: 'REDIS_URL is required to enqueue notifications.',
        requestId: req.requestId || null
      });
    }

    var job = await queue.enqueueNotification(validation.data);
    log.info('notification.enqueue.accepted', {
      requestId: req.requestId || null,
      queueJobId: String(job.id),
      userId: validation.data.userId,
      eventType: validation.data.eventType
    });

    return res.status(202).json({
      status: 'accepted',
      jobId: job.id,
      requestId: req.requestId || null
    });
  } catch (error) {
    log.error('notification.enqueue.failed', {
      requestId: req.requestId || null,
      message: error.message
    });

    return res.status(500).json({
      error: 'enqueue_failed',
      message: error.message,
      requestId: req.requestId || null
    });
  }
});

router.get('/deliveries/:jobId', notificationAuth, function(req, res) {
  var delivery = getByQueueJobId(req.params.jobId);

  if (!delivery) {
    return res.status(404).json({
      error: 'delivery_not_found',
      requestId: req.requestId || null
    });
  }

  return res.json(Object.assign({}, delivery, {
    requestId: req.requestId || null
  }));
});

module.exports = router;
