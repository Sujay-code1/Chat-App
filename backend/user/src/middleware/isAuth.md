# isAuth middleware

Description:

- Verifies incoming requests contain a valid JWT in the `Authorization` header (`Bearer <token>`).
- Verifies the token using `process.env.JWT_SECRET` and attaches the token `user` payload to `req.user`.
- Returns `401` for missing/invalid tokens and `500` for unexpected server errors.

Usage:

In an Express route, add the middleware to protect the route:

```ts
import express from 'express';
import { isAuth } from './middleware/isAuth';

const router = express.Router();

router.get('/profile', isAuth, (req, res) => {
  // `req.user` is populated from the token payload
  res.json({ user: req.user });
});
```

Behavior & Flow:

1. Read `Authorization` header.
2. If missing or not `Bearer <token>`, respond `401`.
3. Extract token and call `jwt.verify(token, process.env.JWT_SECRET as string)`.
4. Expect the decoded payload to include a `user` field; if missing, respond `401`.
5. Assign `decodedValue.user` to `req.user` and call `next()`.
6. Any other exceptions return `500`.

Notes & Recommendations:

- Make sure `JWT_SECRET` is configured in environment variables; otherwise verification may fail or throw.
- Current implementation expects the token to contain a `user` object. If your tokens only include a `user id`, change the middleware to look up the user in the database and attach the found document to `req.user`.
- Consider returning `401` for token verification errors (invalid/expired) instead of a generic `500`.

Quick checklist:

- [ ] `JWT_SECRET` is set in `.env`.
- [ ] Tokens include a `user` payload or update middleware to fetch by id.

If you want, I can modify the middleware to fetch the full user from the DB by id and return `401` for verification failures—tell me which behavior you prefer.
