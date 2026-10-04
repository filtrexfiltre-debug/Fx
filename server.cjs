const express = require('express');
const dotenv = require('dotenv');
const { authenticate, verifyToken, loadUsers, getAuthSecret } = require('./server/identity.cjs');
const { appendAudit, listAudit } = require('./server/audit.cjs');

dotenv.config();

const app = express();
const port = Number(process.env.API_PORT || 3001);
const authSecret = getAuthSecret();

app.use(express.json({ limit: '32kb' }));

const failedAttempts = new Map();

app.post('/api/auth/login', (request, response) => {
  const email = typeof request.body?.email === 'string' ? request.body.email.trim().toLowerCase() : '';
  const password = typeof request.body?.password === 'string' ? request.body.password : '';
  const ip = request.ip;
  const attempt = failedAttempts.get(ip) || { count: 0, blockedUntil: 0 };

  if (attempt.blockedUntil > Date.now()) {
    return response.status(429).json({ message: 'Çok fazla başarısız deneme. Lütfen daha sonra tekrar deneyin.' });
  }

  const result = authenticate(email, password, authSecret);
  if (!result) {
    attempt.count += 1;
    if (attempt.count >= 5) {
      attempt.count = 0;
      attempt.blockedUntil = Date.now() + 60 * 1000;
    }
    failedAttempts.set(ip, attempt);
    return response.status(401).json({ message: 'E-posta veya şifre geçersiz.' });
  }

  failedAttempts.delete(ip);
  appendAudit({
    tenantId: result.claims.tenantId,
    branchId: result.claims.branchId,
    userId: result.claims.sub,
    action: 'auth.login',
    entityType: 'user',
    entityId: result.claims.sub,
    ip,
  });
  return response.json({ token: result.token, user: result.user });
});

const requirePermission = (permission) => (request, response, next) => {
  const header = request.headers.authorization || '';
  const claims = verifyToken(header.replace(/^Bearer\s+/i, ''), authSecret);
  if (!claims) return response.status(401).json({ message: 'Oturum geçersiz.' });
  if (!claims.permissions.includes(permission)) return response.status(403).json({ message: 'Yetkiniz yok.' });
  request.claims = claims;
  next();
};

app.get('/api/audit-logs', requirePermission('audit.read'), (request, response) => {
  response.json(listAudit(request.claims.tenantId));
});

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`FX API listening on http://localhost:${port} (${loadUsers().length} configured users)`);
});
