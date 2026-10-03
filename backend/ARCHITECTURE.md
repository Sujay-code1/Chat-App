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

## Endpoint checks

Use these quick checks to verify each HTTP endpoint is reachable and behaving as expected. Replace `localhost:5000` with the service host/port from your environment if different.

- Health / basic reachability

  - Intent: confirm the HTTP server is running and accepts requests.
  - Command:

  ```bash
  curl -v http://localhost:5000/
  ```

  - Expected: a 200 or 404 from the server (server responds). If you get "Connection refused" or "Failed to connect", the service isn't running on that port.

- POST /api/v1/login (request OTP)

  - Intent: send an OTP to an email (creates OTP in Redis and publishes to RabbitMQ).
  - Command:

  ```bash
  curl -v -X POST http://localhost:5000/api/v1/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com"}'
  ```

  - Expected: HTTP 200 with JSON body similar to `{ "message": "OTP sent to your mail" }`.
  - If you see a network error: the server is not reachable (wrong port, service down, firewall). If you get a JSON error, read the `message` field.

- POST /api/v1/verify (verify OTP)

  - Intent: verify the OTP previously sent, create the user, and return a token.
  - Command (replace `123456` with the real OTP):

  ```bash
  curl -v -X POST http://localhost:5000/api/v1/verify \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","otp":"123456"}'
  ```

  - Expected: HTTP 200 with JSON body including `token` and `user` fields.

- GET /api/v1/me (authenticated)

  - Intent: validate that protected endpoints accept the JWT returned from `/verify`.
  - Command:

  ```bash
  curl -v http://localhost:5000/api/v1/me -H "Authorization: Bearer <TOKEN>"
  ```

  - Expected: HTTP 200 with the current user's JSON profile. If you receive 401/403, check the `Authorization` header formatting and `JWT_SECRET`.

- CORS & Browser checks

  - Intent: ensure frontend running on a different port can call backend.
  - Debugging steps:
    - From browser DevTools, check the Network tab for the request and CORS preflight (OPTIONS) failures.
    - In the backend, `app.use(cors())` allows all origins in this codebase; if you have a stricter policy, add the frontend origin.

- Common failure modes

  - "Network Error" (Axios): backend not running or wrong port/host.
  - 429 from `/login`: rate-limit key present in Redis (wait 60s or clear key for testing).
  - 400 from `/verify`: OTP missing or wrong — ensure correct OTP is used.

If you want, I can add a small `health` endpoint and example Postman collection to automate these checks.
