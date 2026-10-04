const crypto = require('node:crypto');
const { authSecret } = require('../config.cjs');

function decodeToken(token) {
  const [payload, signature, extra] = String(token || '').split('.');
  if (!payload || !signature || extra) return null;
  const expected = crypto.createHmac('sha256', authSecret).update(payload).digest();
  let actual;
  try {
    actual = Buffer.from(signature, 'base64url');
  } catch {
    return null;
  }
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!claims.sub || !claims.tenantId || !claims.branchId || !Number.isFinite(claims.exp) ||
      claims.exp <= Math.floor(Date.now() / 1000) || !Array.isArray(claims.permissions)) return null;
    return claims;
  } catch {
    return null;
  }
}

function authenticate(request, response, next) {
  const authorization = request.get('authorization') || '';
  const claims = authorization.startsWith('Bearer ') ? decodeToken(authorization.slice(7)) : null;
  if (!claims) return response.status(401).json({ message: 'Oturum geçersiz veya süresi dolmuş.' });
  request.user = claims;
  next();
}

module.exports = { authenticate, decodeToken };
