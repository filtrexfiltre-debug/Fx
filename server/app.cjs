const express = require('express');
const { corsOrigin } = require('./config.cjs');
const authRoutes = require('./routes/auth.cjs');
const ledgerRoutes = require('./routes/ledger.cjs');
const auditRoutes = require('./routes/audit.cjs');
const healthRoutes = require('./routes/health.cjs');
const { notFound, errorHandler } = require('./middleware/errors.cjs');

function createApp() {
  const app = express();
  app.disable('x-powered-by');
  if (corsOrigin) {
    app.use((request, response, next) => {
      const origin = request.get('origin');
      if (origin === corsOrigin) {
        response.set('Access-Control-Allow-Origin', origin);
        response.set('Vary', 'Origin');
        response.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
        response.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      }
      if (request.method === 'OPTIONS') return response.sendStatus(origin === corsOrigin ? 204 : 403);
      next();
    });
  }
  app.use(express.json({ limit: '32kb' }));
  app.use('/api/auth', authRoutes);
  app.use('/api/health', healthRoutes);
  app.use('/api/ledger', ledgerRoutes);
  app.use('/api/audit-logs', auditRoutes);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
