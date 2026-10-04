const dotenv = require('dotenv');

dotenv.config();

module.exports = {
  port: Number(process.env.API_PORT || 3001),
  authSecret: process.env.FX_AUTH_SECRET || 'fx-enterprise-default-development-secret-key-32chars!',
  databaseUrl: process.env.DATABASE_URL || '',
  corsOrigin: process.env.CORS_ORIGIN || '',
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60000),
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX || 100),
  loginRateLimitMax: Number(process.env.RATE_LIMIT_LOGIN_MAX || 10),
};
