/**
 * localToken.js
 * Creates Firebase custom auth tokens locally using the service account private key.
 * This avoids any outbound OAuth2 calls to accounts.google.com, which can fail on
 * local dev environments with restricted DNS.
 *
 * Firebase custom tokens are standard RS256-signed JWTs - no network call needed to create them.
 * See: https://firebase.google.com/docs/auth/admin/create-custom-tokens
 */

const crypto = require('crypto');

/**
 * Base64url-encode a Buffer or string.
 */
function b64url(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(JSON.stringify(input));
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Create a Firebase custom token locally by signing a JWT with RS256
 * using the service account private key — no outbound network calls required.
 *
 * @param {string} uid  - The Firebase UID to encode in the token
 * @param {object} [claims] - Optional custom claims to embed
 * @returns {string} - A signed JWT string suitable for signInWithCustomToken()
 */
function createLocalCustomToken(uid, claims = {}) {
  const rawKey = process.env.FIREBASE_PRIVATE_KEY || '';
  const privateKey = rawKey.includes('\\n') ? rawKey.replace(/\\n/g, '\n') : rawKey;
  const serviceEmail = process.env.FIREBASE_CLIENT_EMAIL || '';

  if (!privateKey || !serviceEmail) {
    throw new Error('FIREBASE_PRIVATE_KEY and FIREBASE_CLIENT_EMAIL must be set in .env');
  }

  const now = Math.floor(Date.now() / 1000);

  // Firebase custom token payload spec
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: serviceEmail,   // issuer = service account email
    sub: serviceEmail,   // subject = service account email
    aud: 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit',
    iat: now,
    exp: now + 3600,     // 1 hour
    uid,
    claims: Object.keys(claims).length ? claims : undefined,
  };

  // Remove undefined keys
  Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

  const headerB64 = b64url(header);
  const payloadB64 = b64url(payload);
  const signingInput = `${headerB64}.${payloadB64}`;

  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signingInput);
  sign.end();
  const signature = sign.sign(privateKey);

  return `${signingInput}.${b64url(signature)}`;
}

module.exports = { createLocalCustomToken };
