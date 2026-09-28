const crypto = require('node:crypto');
const express = require('express');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = Number(process.env.API_PORT || 3001);
const authSecret = process.env.FX_AUTH_SECRET || 'fx-enterprise-default-development-secret-key-32chars!';

app.use(express.json({ limit: '32kb' }));

const defaultTestSalt = 'd3adbeefd3adbeefd3adbeefd3adbeef';
const defaultTestHash = crypto.scryptSync('123456', defaultTestSalt, 64).toString('hex');

const defaultUsers = [
  {
    email: 'patron@enterprise.com',
    name: 'Ahmet Yılmaz (Yönetici)',
    role: 'Patron',
    branchId: 'all',
    passwordHash: defaultTestHash,
    passwordSalt: defaultTestSalt,
  },
  {
    email: 'kadikoy@enterprise.com',
    name: 'Burak Demir (Kadıköy Müdürü)',
    role: 'Şube Yöneticisi',
    branchId: 'b2222222-2222-2222-2222-222222222222',
    passwordHash: defaultTestHash,
    passwordSalt: defaultTestSalt,
  },
  {
    email: 'merkez@enterprise.com',
    name: 'Selin Kaya (Merkez Sorumlusu)',
    role: 'Şube Yöneticisi',
    branchId: 'b1111111-1111-1111-1111-111111111111',
    passwordHash: defaultTestHash,
    passwordSalt: defaultTestSalt,
  },
];

const readUsers = () => {
  if (!process.env.FX_AUTH_USERS_JSON) {
    return defaultUsers;
  }
  try {
    const users = JSON.parse(process.env.FX_AUTH_USERS_JSON);
    return Array.isArray(users) && users.length > 0 ? users : defaultUsers;
  } catch {
    return defaultUsers;
  }
};

const configuredUsers = readUsers();

const verifyPassword = (password, user) => {
  if (typeof user.passwordHash !== 'string' || typeof user.passwordSalt !== 'string') return false;

  const expected = Buffer.from(user.passwordHash, 'hex');
  const actual = crypto.scryptSync(password, user.passwordSalt, expected.length);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
};

const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');

const createToken = (user) => {
  const payload = encode({
    sub: user.id || user.email,
    email: user.email,
    role: user.role,
    branchId: user.branchId,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 8,
  });
  const signature = crypto.createHmac('sha256', authSecret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
};

const failedAttempts = new Map();

app.post('/api/auth/login', (request, response) => {
  const email = typeof request.body?.email === 'string' ? request.body.email.trim().toLowerCase() : '';
  const password = typeof request.body?.password === 'string' ? request.body.password : '';
  const ip = request.ip;
  const attempt = failedAttempts.get(ip) || { count: 0, blockedUntil: 0 };

  if (attempt.blockedUntil > Date.now()) {
    return response.status(429).json({ message: 'Çok fazla başarısız deneme. Lütfen daha sonra tekrar deneyin.' });
  }

  const user = configuredUsers.find((candidate) => candidate.email?.toLowerCase() === email);
  if (!user || !verifyPassword(password, user)) {
    attempt.count += 1;
    if (attempt.count >= 5) {
      attempt.count = 0;
      attempt.blockedUntil = Date.now() + 60 * 1000;
    }
    failedAttempts.set(ip, attempt);
    return response.status(401).json({ message: 'E-posta veya şifre geçersiz.' });
  }

  failedAttempts.delete(ip);
  return response.json({
    token: createToken(user),
    user: {
      email: user.email,
      name: user.name,
      role: user.role,
      branchId: user.branchId,
    },
  });
});

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`FX API listening on http://localhost:${port} (${configuredUsers.length} configured users)`);
});
