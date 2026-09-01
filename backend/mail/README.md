# Mail Service

This service consumes `send-otp` messages from RabbitMQ and sends OTP emails.

## Required environment variables

- `RABBITMQ_HOST` (default: `localhost`)
- `RABBITMQ_PORT` (default: `5672`)
- `RABBITMQ_USERNAME` (default: `guest`)
- `RABBITMQ_PASSWORD` (default: `guest`)

SMTP configuration (one of the sets must be provided):

Preferred:
- `SMTP_USER` — SMTP username (e.g. full email address)
- `SMTP_PASS` — SMTP password or app password

Fallback (less explicit):
- `USER` — username
- `PASSWORD` — password

Optional SMTP configuration:
- `SMTP_HOST` (default: `smtp.gmail.com`)
- `SMTP_PORT` (default: `465`)
- `SMTP_SECURE` (default: `true`) — set to `false` for non-TLS ports
- `SMTP_FROM` — optional `From` header override (default: `Chat App <SMTP_USER>`)

## Running

Install dependencies and build (from `backend/mail`):

```bash
npm install
npm run build
npm run start
```

Run in development (watch):

```bash
npm run dev
```

## Message format

Messages consumed on the `send-otp` queue should be JSON with the shape:

```json
{
  "to": "user@example.com",
  "subject": "Your OTP",
  "body": "123456"
}
```

## Notes

- If SMTP credentials are missing, the consumer will nack the message and log an error rather than throwing and crashing the process.
- Adjust `channel.nack` behavior if you prefer messages to be requeued for retry.
