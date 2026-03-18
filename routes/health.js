var express = require('express');
var IORedis = require('ioredis');

var getNotificationConfig = require('../config/notifications').getNotificationConfig;

var router = express.Router();

router.get('/livez', function(req, res) {
  return res.status(200).json({
    status: 'ok',
    service: 'language-buddy-backend',
    requestId: req.requestId
  });
});

router.get('/readyz', async function(req, res) {
  var config = getNotificationConfig();
  var checks = [];

  checks.push({
    component: 'config.notificationAuthToken',
    ok: Boolean(config.api.authToken)
  });

  checks.push({
    component: 'config.whatsappToken',
    ok: Boolean(config.whatsapp.token)
  });

  checks.push({
    component: 'config.whatsappPhoneNumberId',
    ok: Boolean(config.whatsapp.phoneNumberId)
  });

  var redisOk = false;

  if (config.redis.url) {
    var client = new IORedis(config.redis.url, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
      connectTimeout: 2000,
      lazyConnect: true
    });

    try {
      await client.connect();
      var pong = await client.ping();
      redisOk = pong === 'PONG';
    } catch (error) {
      redisOk = false;
    } finally {
      await client.quit().catch(function() {});
    }
  }

  checks.push({
    component: 'redis.ping',
    ok: redisOk
  });

  var allOk = checks.every(function(item) {
    return item.ok;
  });

  return res.status(allOk ? 200 : 503).json({
    status: allOk ? 'ready' : 'not_ready',
    checks: checks,
    requestId: req.requestId
  });
});

module.exports = router;
