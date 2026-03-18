var express = require('express');
var createHmac = require('crypto').createHmac;
var timingSafeEqual = require('crypto').timingSafeEqual;

var deliveryRepository = require('../services/notifications/deliveryRepository');
var getNotificationConfig = require('../config/notifications').getNotificationConfig;
var log = require('../services/notifications/logger');

var router = express.Router();

function validateSignature(req, res, next) {
  var config = getNotificationConfig();

  if (!config.security.validateWebhookSignature) {
    return next();
  }

  if (!config.security.webhookAppSecret) {
    return res.status(500).json({
      error: 'webhook_signature_not_configured'
    });
  }

  var headerSignature = req.get('x-hub-signature-256') || '';
  if (!headerSignature.startsWith('sha256=')) {
    return res.status(401).json({
      error: 'invalid_signature'
    });
  }

  var payloadBuffer = req.rawBody || Buffer.from(JSON.stringify(req.body || {}));
  var expected = 'sha256=' + createHmac('sha256', config.security.webhookAppSecret)
    .update(payloadBuffer)
    .digest('hex');

  var expectedBuffer = Buffer.from(expected);
  var actualBuffer = Buffer.from(headerSignature);

  if (expectedBuffer.length !== actualBuffer.length || !timingSafeEqual(expectedBuffer, actualBuffer)) {
    return res.status(401).json({
      error: 'invalid_signature'
    });
  }

  next();
}

function mapProviderStatusToInternal(status) {
  if (status === 'read' || status === 'delivered' || status === 'sent') {
    return 'sent';
  }

  if (status === 'failed') {
    return 'failed';
  }

  return 'queued';
}

router.get('/whatsapp', function(req, res) {
  var config = getNotificationConfig();
  var mode = req.query['hub.mode'];
  var token = req.query['hub.verify_token'];
  var challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token && token === config.whatsapp.webhookVerifyToken) {
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

router.post('/whatsapp', validateSignature, function(req, res) {
  var body = req.body || {};
  var updates = 0;

  var entries = Array.isArray(body.entry) ? body.entry : [];

  entries.forEach(function(entry) {
    var changes = Array.isArray(entry.changes) ? entry.changes : [];

    changes.forEach(function(change) {
      var value = change.value || {};
      var statuses = Array.isArray(value.statuses) ? value.statuses : [];

      statuses.forEach(function(item) {
        if (!item.id) {
          return;
        }

        var patch = {
          providerStatus: item.status || null,
          status: mapProviderStatusToInternal(item.status),
          errorCode: item.errors && item.errors[0] ? item.errors[0].code : null,
          errorMessage: item.errors && item.errors[0] ? item.errors[0].title : null
        };

        var updated = deliveryRepository.updateByProviderMessageId(item.id, patch);
        if (updated) {
          updates += 1;
        }
      });
    });
  });

  log.info('webhook.whatsapp.processed', {
    updates: updates,
    requestId: req.requestId || null
  });

  return res.status(200).json({
    status: 'ok',
    updates: updates
  });
});

module.exports = router;
