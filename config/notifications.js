var requiredInProduction = [
  'WHATSAPP_TOKEN',
  'WHATSAPP_PHONE_NUMBER_ID',
  'REDIS_URL',
  'NOTIFICATION_AUTH_TOKEN'
];

function toInt(value, fallback) {
  var parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function getNotificationConfig() {
  return {
    whatsapp: {
      token: process.env.WHATSAPP_TOKEN || '',
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
      apiVersion: process.env.WHATSAPP_API_VERSION || 'v22.0',
      webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || ''
    },
    redis: {
      url: process.env.REDIS_URL || ''
    },
    api: {
      authToken: process.env.NOTIFICATION_AUTH_TOKEN || ''
    },
    behavior: {
      retryAttempts: toInt(process.env.NOTIFICATION_RETRY_ATTEMPTS, 5),
      backoffMs: toInt(process.env.NOTIFICATION_BACKOFF_MS, 2000),
      queueRateLimitMax: toInt(process.env.NOTIFICATION_QUEUE_RATE_LIMIT_MAX, 30),
      queueRateLimitDurationMs: toInt(process.env.NOTIFICATION_QUEUE_RATE_LIMIT_DURATION_MS, 1000),
      enableErrorNotifications: process.env.ENABLE_ERROR_NOTIFICATIONS === 'true'
    },
    security: {
      webhookAppSecret: process.env.WHATSAPP_APP_SECRET || '',
      validateWebhookSignature: process.env.WHATSAPP_WEBHOOK_VALIDATE_SIGNATURE !== 'false'
    },
    env: process.env.NODE_ENV || 'development'
  };
}

function validateNotificationConfig(config) {
  var env = config.env;
  var shouldEnforce = env !== 'development' && env !== 'test';

  if (!shouldEnforce) {
    return;
  }

  var missing = requiredInProduction.filter(function(key) {
    return !process.env[key];
  });

  if (missing.length > 0) {
    throw new Error('Missing required notification env vars: ' + missing.join(', '));
  }

  if (config.security.validateWebhookSignature && !config.security.webhookAppSecret) {
    throw new Error('WHATSAPP_APP_SECRET is required when webhook signature validation is enabled.');
  }
}

module.exports = {
  getNotificationConfig: getNotificationConfig,
  validateNotificationConfig: validateNotificationConfig
};
