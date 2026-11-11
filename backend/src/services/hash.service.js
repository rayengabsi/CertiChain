const crypto = require('node:crypto');

/** SHA-256 over the exact bytes — computed SERVER-SIDE only. Client-supplied hashes are never trusted. */
function sha256Hex(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

module.exports = { sha256Hex };
