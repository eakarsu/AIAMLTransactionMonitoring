const crypto = require('node:crypto');

const KEY_LENGTH = 64;
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  if (typeof password !== 'string' || password.length < 12) throw new Error('password must be at least 12 characters');
  return `scrypt$${salt}$${crypto.scryptSync(password, salt, KEY_LENGTH).toString('hex')}`;
}
function verifyPassword(password, encoded) {
  if (typeof password !== 'string' || typeof encoded !== 'string') return false;
  const [scheme, salt, digest] = encoded.split('$');
  if (scheme !== 'scrypt' || !salt || !digest) return false;
  const actual = crypto.scryptSync(password, salt, KEY_LENGTH);
  const expected = Buffer.from(digest, 'hex');
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}
function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32 || /replace|secret-key-2026/i.test(secret)) throw new Error('JWT_SECRET must be a non-default value of at least 32 characters');
  return secret;
}
function tenantId(user) {
  const value = String(user?.tenant_id || '').trim();
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(value)) throw new Error('token does not contain a valid tenant_id');
  return value;
}
module.exports = { getJwtSecret, hashPassword, tenantId, verifyPassword };
