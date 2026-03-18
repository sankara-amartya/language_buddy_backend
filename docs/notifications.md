# Notifications Setup

## What is implemented

- Authenticated enqueue endpoint: `POST /notifications/send`
- Authenticated delivery lookup endpoint: `GET /notifications/deliveries/:jobId`
- Queue-backed processing with BullMQ + Redis
- Worker process for WhatsApp delivery
- Optional backend 5xx alert enqueue from global error handler
- JSON-backed user repository for phone + opt-in lookup
- JSON-backed delivery persistence for queued, sent, blocked, failed
- WhatsApp webhook endpoints for verification and status updates
- Request tracing with `x-request-id`
- Structured JSON logs for enqueue, worker events, and webhook processing
- Worker-side throughput limiter for stable provider traffic
- Health probes: `GET /health/livez`, `GET /health/readyz`

## Required environment variables

Use `.env.example` as reference.

Critical values:
- `NOTIFICATION_AUTH_TOKEN`
- `REDIS_URL`
- `WHATSAPP_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
- `WHATSAPP_APP_SECRET`

Optional:
- `ENABLE_ERROR_NOTIFICATIONS=true`
- `ALERT_ADMIN_PHONE_E164=+15551234567`
- `WHATSAPP_WEBHOOK_VALIDATE_SIGNATURE=true`
- `NOTIFICATION_QUEUE_RATE_LIMIT_MAX=30`
- `NOTIFICATION_QUEUE_RATE_LIMIT_DURATION_MS=1000`

## Run locally

1. Start Redis
2. Start app:
   - `npm run dev`
3. Start worker in second terminal:
   - `npm run dev:worker`

## Trigger from another app

Endpoint:
- `POST /notifications/send`

Headers:
- `Authorization: Bearer <NOTIFICATION_AUTH_TOKEN>`
- `Content-Type: application/json`

Sample payload:

```json
{
  "userId": "user-123",
  "eventType": "external_api_request",
  "message": "Your alert was raised.",
  "idempotencyKey": "external-user-123-001"
}
```

The worker resolves recipient and consent by `userId` from `data/users.json`.

## User management endpoints

- `GET /users/:id`
- `POST /users/upsert`

Sample upsert payload:

```json
{
  "id": "user-123",
  "name": "Demo User",
  "phoneE164": "+15551234567",
  "whatsappOptIn": true
}
```

## Webhook endpoints

- `GET /webhooks/whatsapp` for Meta verification challenge
- `POST /webhooks/whatsapp` for delivery status callbacks

Security behavior:
- Signature verification uses `X-Hub-Signature-256` and `WHATSAPP_APP_SECRET`.
- To disable signature checks in local-only testing, set `WHATSAPP_WEBHOOK_VALIDATE_SIGNATURE=false`.

## Health and readiness

- `GET /health/livez` for liveness checks.
- `GET /health/readyz` validates config and Redis connectivity.

## Delivery persistence

Delivery records are written to `data/notification-deliveries.json`.
You can fetch one record by queue job id with:

- `GET /notifications/deliveries/:jobId`

## Current limitations

- JSON files are used as starter persistence (not a production database).
- No background cleanup policy yet for old delivery records.
- Webhook replay protection (nonce/timestamp store) is not implemented yet.
