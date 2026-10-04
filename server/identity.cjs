/**
 * FX identity model (local/dev store).
 *
 * Mirrors the schema.sql tables: tenants, branches, users, roles, permissions,
 * user_roles, role_permissions. Everything below the "DATA ACCESS" marker is the
 * only part that touches storage; swap those functions for SQL queries
 * (SELECT ... FROM users JOIN user_roles ...) when the Postgres backend lands.
 * Claims (tenantId, branchId, roles, permissions) are derived purely from the model.
 */
const crypto = require('node:crypto');

const TENANT_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const BRANCH_MERKEZ = 'b1111111-1111-1111-1111-111111111111';
const BRANCH_KADIKOY = 'b2222222-2222-2222-2222-222222222222';

const permissions = [
  'branch.switch',
  'finance.transaction.create',
  'finance.transaction.read',
  'finance.transfer.approve',
  'cash_account.manage',
  'audit.read',
];

const roles = [
  { id: 'r-patron', tenantId: TENANT_ID, code: 'PATRON', name: 'Patron', isGlobal: true },
  { id: 'r-sube-yoneticisi', tenantId: TENANT_ID, code: 'SUBE_YONETICISI', name: 'Şube Yöneticisi', isGlobal: false },
];

const rolePermissions = {
  PATRON: [...permissions],
  SUBE_YONETICISI: ['finance.transaction.create', 'finance.transaction.read', 'finance.transfer.approve'],
};

const testSalt = 'd3adbeefd3adbeefd3adbeefd3adbeef';
const testHash = crypto.scryptSync('123456', testSalt, 64).toString('hex');

// users.branch_id === null => global user
const defaultUsers = [
  { id: 'u-patron', tenantId: TENANT_ID, branchId: null, email: 'patron@enterprise.com', fullName: 'Ahmet Yılmaz (Yönetici)', roleCodes: ['PATRON'], passwordHash: testHash, passwordSalt: testSalt },
  { id: 'u-kadikoy', tenantId: TENANT_ID, branchId: BRANCH_KADIKOY, email: 'kadikoy@enterprise.com', fullName: 'Burak Demir (Kadıköy Müdürü)', roleCodes: ['SUBE_YONETICISI'], passwordHash: testHash, passwordSalt: testSalt },
  { id: 'u-merkez', tenantId: TENANT_ID, branchId: BRANCH_MERKEZ, email: 'merkez@enterprise.com', fullName: 'Selin Kaya (Merkez Sorumlusu)', roleCodes: ['SUBE_YONETICISI'], passwordHash: testHash, passwordSalt: testSalt },
];

// ---------------------------------------------------------------- DATA ACCESS
const loadUsers = () => {
  if (!process.env.FX_AUTH_USERS_JSON) return defaultUsers;
  try {
    const parsed = JSON.parse(process.env.FX_AUTH_USERS_JSON);
    if (!Array.isArray(parsed) || parsed.length === 0) return defaultUsers;
    return parsed.map((u) => ({
      id: u.id || u.email,
      tenantId: u.tenantId || TENANT_ID,
      branchId: u.branchId && u.branchId !== 'all' ? u.branchId : null,
      email: u.email,
      fullName: u.fullName || u.name,
      roleCodes: u.roleCodes || (u.role === 'Patron' ? ['PATRON'] : ['SUBE_YONETICISI']),
      passwordHash: u.passwordHash,
      passwordSalt: u.passwordSalt,
    }));
  } catch {
    return defaultUsers;
  }
};

const findUserByEmail = (users, email) => users.find((u) => u.email?.toLowerCase() === email);
const findRolesByCodes = (codes) => roles.filter((r) => codes.includes(r.code));
const findPermissionsByRole = (roleCode) => rolePermissions[roleCode] || [];
// ------------------------------------------------------------------------------

const verifyPassword = (password, user) => {
  if (typeof user.passwordHash !== 'string' || typeof user.passwordSalt !== 'string') return false;
  const expected = Buffer.from(user.passwordHash, 'hex');
  const actual = crypto.scryptSync(password, user.passwordSalt, expected.length);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
};

/** Derives tenant/branch-aware claims from the user -> roles -> permissions model. */
const buildClaims = (user) => {
  const userRoles = findRolesByCodes(user.roleCodes);
  const perms = [...new Set(userRoles.flatMap((r) => findPermissionsByRole(r.code)))];
  const isGlobal = user.branchId === null && userRoles.some((r) => r.isGlobal);
  return {
    sub: user.id,
    email: user.email,
    tenantId: user.tenantId,
    branchId: isGlobal ? null : user.branchId,
    isGlobal,
    roles: userRoles.map((r) => r.code),
    permissions: perms,
  };
};

const sign = (payload, secret) => {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${signature}`;
};

const verifyToken = (token, secret) => {
  if (typeof token !== 'string') return null;
  const [body, signature] = token.split('.');
  if (!body || !signature) return null;
  const expected = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const claims = JSON.parse(Buffer.from(body, 'base64url').toString());
    const valid = typeof claims.exp === 'number' && Array.isArray(claims.permissions) && claims.exp > Math.floor(Date.now() / 1000);
    return valid ? claims : null;
  } catch {
    return null;
  }
};

/** Returns { token, user, claims } or null when credentials are invalid. */
const authenticate = (email, password, secret) => {
  const users = loadUsers();
  const user = findUserByEmail(users, String(email || '').trim().toLowerCase());
  if (!user || !verifyPassword(String(password || ''), user)) return null;

  const claims = buildClaims(user);
  const token = sign({ ...claims, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 8 }, secret);
  const primaryRole = findRolesByCodes(user.roleCodes)[0];
  return {
    token,
    claims,
    user: {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      name: user.fullName,
      role: primaryRole?.name || '',
      roles: claims.roles,
      permissions: claims.permissions,
      isGlobal: claims.isGlobal,
      // 'all' is the legacy UI sentinel for global users (branch_id NULL in the DB)
      branchId: claims.isGlobal ? 'all' : claims.branchId,
    },
  };
};

const DEV_SECRET = 'fx-enterprise-default-development-secret-key-32chars!';
/** Single source for the signing secret; refuses the dev default in production. */
const getAuthSecret = () => {
  if (process.env.FX_AUTH_SECRET) return process.env.FX_AUTH_SECRET;
  if (process.env.NODE_ENV === 'production') throw new Error('FX_AUTH_SECRET must be set in production.');
  return DEV_SECRET;
};

module.exports = { getAuthSecret, authenticate, verifyToken, buildClaims, loadUsers, permissions, roles, TENANT_ID };
