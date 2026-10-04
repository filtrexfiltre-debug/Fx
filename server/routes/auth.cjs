const express = require('express');
const { login } = require('../services/authService.cjs');
const { createRateLimiter } = require('../middleware/rateLimit.cjs');
const { loginRateLimitMax, rateLimitWindowMs } = require('../config.cjs');

const router = express.Router();
const rateLimit = createRateLimiter({ windowMs: rateLimitWindowMs, max: loginRateLimitMax });

router.use('/login', rateLimit);

router.post('/login', (request, response) => {
  const email = typeof request.body?.email === 'string' ? request.body.email.trim().toLowerCase() : '';
  const password = typeof request.body?.password === 'string' ? request.body.password : '';
  const result = login(email, password);
  if (!result) return response.status(401).json({ message: 'E-posta veya şifre geçersiz.' });
  response.json(result);
});

module.exports = router;
