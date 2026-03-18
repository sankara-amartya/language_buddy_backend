var z = require('zod');

var notificationEventTypes = [
  'backend_error',
  'app_alert',
  'user_action',
  'external_api_request'
];

var notificationStatusTypes = [
  'queued',
  'sent',
  'failed',
  'blocked'
];

var sendNotificationSchema = z.object({
  userId: z.string().min(1),
  eventType: z.enum(notificationEventTypes),
  message: z.string().min(1).max(4096),
  metadata: z.record(z.any()).optional(),
  idempotencyKey: z.string().min(1).optional()
});

function validateSendNotificationPayload(payload) {
  return sendNotificationSchema.safeParse(payload);
}

module.exports = {
  notificationEventTypes: notificationEventTypes,
  notificationStatusTypes: notificationStatusTypes,
  sendNotificationSchema: sendNotificationSchema,
  validateSendNotificationPayload: validateSendNotificationPayload
};
