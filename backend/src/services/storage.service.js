const fsp = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

const UPLOADS_DIR = path.resolve(__dirname, '..', '..', 'uploads');

/**
 * Store a buffer under a RANDOM server-generated name.
 * - Client filenames never touch the filesystem (path traversal impossible).
 * - The exact bytes that were hashed are the bytes that are stored.
 * - The directory is never statically served; downloads are not part of the MVP.
 */
async function storeFile(buffer) {
  await fsp.mkdir(UPLOADS_DIR, { recursive: true });
  const name = `${crypto.randomUUID()}.pdf`;
  const filePath = path.join(UPLOADS_DIR, name);
  await fsp.writeFile(filePath, buffer);
  return { filePath, size: buffer.length };
}

async function readFile(filePath) {
  return fsp.readFile(filePath);
}

module.exports = { storeFile, readFile, UPLOADS_DIR };
