const crypto = require('node:crypto');

const [email, name, role, branchId] = process.argv.slice(2);
if (!email || !name || !role || !branchId) {
  console.error('Kullanım: node scripts/create_auth_user.cjs email name role branchId');
  process.exit(1);
}

const password = process.env.AUTH_PASSWORD;
if (!password) {
  console.error('AUTH_PASSWORD ortam değişkenini interaktif veya güvenli bir ortamda sağlayın.');
  process.exit(1);
}

const passwordSalt = crypto.randomBytes(16).toString('hex');
const passwordHash = crypto.scryptSync(password, passwordSalt, 64).toString('hex');

console.log(JSON.stringify({ email, name, role, branchId, passwordHash, passwordSalt }));
