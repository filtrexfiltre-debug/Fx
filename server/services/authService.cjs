const crypto = require('node:crypto');
const { authSecret } = require('../config.cjs');

const tenantId = 'a1111111-1111-1111-1111-111111111111';
const defaultSalt = 'd3adbeefd3adbeefd3adbeefd3adbeef';
const defaultHash = crypto.scryptSync('123456', defaultSalt, 64).toString('hex');
const rolePermissions = {
  Patron: ['finance.read', 'finance.write', 'finance.export', 'audit.read', 'audit.write', 'audit.export', 'report.consolidated'],
  'Şube Yöneticisi': ['finance.read', 'finance.write', 'audit.read', 'audit.write'],
};
const defaults = [
  { email: 'patron@enterprise.com', name: 'Ahmet Yılmaz (Yönetici)', role: 'Patron', branchId: 'all', isGlobal: true },
  { email: 'kadikoy@enterprise.com', name: 'Burak Demir (Kadıköy Müdürü)', role: 'Şube Yöneticisi', branchId: 'b2222222-2222-2222-2222-222222222222' },
  { email: 'merkez@enterprise.com', name: 'Selin Kaya (Merkez Sorumlusu)', role: 'Şube Yöneticisi', branchId: 'b1111111-1111-1111-1111-111111111111' },
].map((user) => ({ ...user, tenantId, passwordHash: defaultHash, passwordSalt: defaultSalt }));

function getUsers() {
  if (!process.env.FX_AUTH_USERS_JSON) return defaults;
  try {
    const configured = JSON.parse(process.env.FX_AUTH_USERS_JSON);
    return Array.isArray(configured) && configured.length > 0 ? configured : defaults;
  } catch {
    return defaults;
  }
}

function verifyPassword(password, user) {
  if (typeof user.passwordHash !== 'string' || typeof user.passwordSalt !== 'string') return false;
  const expected = Buffer.from(user.passwordHash, 'hex');
  if (!expected.length) return false;
  const actual = crypto.scryptSync(password, user.passwordSalt, expected.length);
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function login(email, password) {
  const user = getUsers().find((candidate) => candidate.email?.toLowerCase() === email);
  if (!user || !verifyPassword(password, user)) return null;
  const permissions = Array.isArray(user.permissions) ? user.permissions : rolePermissions[user.role] || [];
  const isGlobal = user.isGlobal === true || user.branchId === 'all';
  const claims = {
    sub: String(user.id || user.email),
    email: user.email,
    name: user.name,
    role: user.role,
    tenantId: user.tenantId || tenantId,
    branchId: isGlobal ? 'all' : user.branchId,
    isGlobal,
    permissions,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 8,
  };
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const signature = crypto.createHmac('sha256', authSecret).update(payload).digest('base64url');
  return {
    token: `${payload}.${signature}`,
    user: {
      id: claims.sub,
      email: claims.email,
      name: claims.name,
      role: claims.role,
      tenantId: claims.tenantId,
      branchId: claims.branchId,
      isGlobal: claims.isGlobal,
      permissions: claims.permissions,
    },
  };
}

module.exports = { login };
