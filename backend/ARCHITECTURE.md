# Backend Architecture — Chat App

## Overview
This document summarizes the backend architecture and how Redis, RabbitMQ, and the Mail & User services are implemented in this repository.

Services:
- Mail service (backend/mail): consumes messages from RabbitMQ and sends email via Nodemailer.
- User service (backend/user): handles user-related HTTP endpoints, generates OTPs, stores them in Redis, and publishes messages to RabbitMQ for email sending.

## Message broker — RabbitMQ
- Connection: created using `amqplib` with host/port/username/password from env.
- Queue used: `send-otp`.
- Publisher: `backend/user/src/config/rabbitmq.ts` exposes `publishToQueue(queueName, message)` which asserts the queue and sends JSON payloads.
- Consumer: `backend/mail/src/consumer.ts` connects to RabbitMQ, creates a channel, asserts `send-otp` queue, and consumes messages. Each message should be JSON with `{ to, subject, body }`.

Code references:
- Publisher: [backend/user/src/config/rabbitmq.ts](backend/user/src/config/rabbitmq.ts)
- Consumer: [backend/mail/src/consumer.ts](backend/mail/src/consumer.ts)

## In-memory / key-value store — Redis
- Redis is used to store OTP values and simple rate-limiting flags.
- Keys and patterns:
  - `otp:<email>` — stores the OTP value (expiry 300s).
  - `otp:ratelimit:<email>` — rate-limit flag (expiry 60s) to prevent frequent OTP requests.
- Redis client: created with `createClient({ url: process.env.REDIS_URL })` and exported as `redisClient` in `backend/user/src/index.ts`.

Code references:
- Redis client & usage: [backend/user/src/index.ts](backend/user/src/index.ts)
- OTP logic and Redis usage: [backend/user/src/controllers/user.ts](backend/user/src/controllers/user.ts)

## Mail service & Nodemailer
- The mail consumer reads messages from the `send-otp` queue and uses Nodemailer to send emails.
- Transport configuration uses SMTP settings from environment variables (e.g. `USER`, `PASSWORD`) — update these for your SMTP provider.
- Expected message shape: `{ to: string, subject: string, body: string }`.

Code references:
- Mail consumer: [backend/mail/src/consumer.ts](backend/mail/src/consumer.ts)

## User Service (HTTP)
- Exposes routes under `/api/v1` (see `backend/user/src/index.ts`) and mounts `user` routes from `backend/user/src/routes/user.ts`.
- Main endpoint: `POST /api/v1/login` — expects `{ email }` in body, creates OTP, stores it in Redis, publishes `send-otp` message.

Code references:
- Routes: [backend/user/src/routes/user.ts](backend/user/src/routes/user.ts)
- Controller: [backend/user/src/controllers/user.ts](backend/user/src/controllers/user.ts)

## Environment variables
The following environment variables are used across services:

- RabbitMQ
  - `RABBITMQ_HOST` (default: `localhost`)
  - `RABBITMQ_PORT` (default: `5672`)
  - `RABBITMQ_USERNAME` (default: `guest`)
  - `RABBITMQ_PASSWORD` (default: `guest`)

- Redis
  - `REDIS_URL` (mandatory)

- Mail / SMTP
  - `USER` (SMTP username/email)
  - `PASSWORD` (SMTP password)

- General
  - `PORT` (HTTP server port for user service)

## How it works (request flow)
1. Client calls `POST /api/v1/login` with `{ email }`.
2. User controller checks `otp:ratelimit:<email>` in Redis; if set, returns 429.
3. Generates OTP, stores it under `otp:<email>` (expires 300s), and sets the ratelimit key (expires 60s).
4. Publishes message to RabbitMQ `send-otp` queue with `{ to: email, subject, body }`.
5. Mail service consumes the message and sends an email via SMTP.

## Run & development
From repository root, to run each service individually:

- User service

```bash
cd backend/user
npm install
npm run build   # or `npm run dev` if available
npm start
```

- Mail service

```bash
cd backend/mail
npm install
npm run build   # or `npm run dev` if available
npm start
```

Notes:
- Ensure RabbitMQ and Redis are running and reachable via the environment variables above.
- If using Gmail SMTP, adjust the Nodemailer transport settings and enable app passwords / less secure app access as applicable.

## Next steps (suggested)
- Add health-check endpoints for each service.
- Add unit/integration tests for publish/consume flow.
- Add Docker compose to run Redis, RabbitMQ, and services together.

---
Generated: architecture summary for current backend implementation.
