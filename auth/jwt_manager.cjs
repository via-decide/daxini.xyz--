const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const JWT_ISSUER = process.env.JWT_ISSUER || 'via-passport-idp';
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'via-ecosystem';

if (!JWT_SECRET || !String(JWT_SECRET).trim()) {
  throw new Error('Missing required JWT_SECRET environment variable.');
}

function parseExpiresToSeconds(expiresIn) {
  if (typeof expiresIn === 'number') return expiresIn;
  const match = String(expiresIn).match(/^(\d+)([smhd])$/);
  if (!match) return 3600;
  const value = Number(match[1]);
  const unit = match[2];
  if (unit === 's') return value;
  if (unit === 'm') return value * 60;
  if (unit === 'h') return value * 3600;
  return value * 86400;
}

function base64UrlEncode(data) {
  return Buffer.from(data).toString('base64url');
}

function base64UrlDecode(data) {
  return Buffer.from(data, 'base64url').toString('utf8');
}

function sign(value) {
  return crypto.createHmac('sha256', JWT_SECRET).update(value).digest('base64url');
}

function generateToken(payload, options = {}) {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + parseExpiresToSeconds(options.expiresIn || JWT_EXPIRES_IN);
  const header = { alg: 'HS256', typ: 'JWT' };
  const body = { ...payload, iat: now, exp, iss: JWT_ISSUER, aud: JWT_AUDIENCE };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedBody = base64UrlEncode(JSON.stringify(body));
  const signature = sign(`${encodedHeader}.${encodedBody}`);
  return `${encodedHeader}.${encodedBody}.${signature}`;
}

function verifyToken(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) throw new Error('Invalid token');
  const [encodedHeader, encodedPayload, signature] = parts;
  const expected = sign(`${encodedHeader}.${encodedPayload}`);
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    throw new Error('Invalid signature');
  }
  const payload = JSON.parse(base64UrlDecode(encodedPayload));
  const now = Math.floor(Date.now() / 1000);
  if (!payload.exp || payload.exp < now) throw new Error('Token expired');
  if (payload.iss !== JWT_ISSUER || payload.aud !== JWT_AUDIENCE) throw new Error('Invalid claims');
  return payload;
}

module.exports = { generateToken, verifyToken };
