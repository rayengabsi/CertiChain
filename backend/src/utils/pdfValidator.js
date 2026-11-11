const ApiError = require('./ApiError');
const { MAX_UPLOAD_BYTES } = require('../config/env');

/**
 * Validate an in-memory PDF buffer BEFORE anything touches the disk:
 *  - size limit (multer already enforces, this is defense in depth)
 *  - magic bytes: must start with "%PDF-" (rejects executables renamed to .pdf)
 *  - structure: "%%EOF" trailer within the last 2 KB (rejects truncated/garbage files)
 */
function validatePdfBuffer(buffer, originalName = 'file') {
  if (!buffer || buffer.length === 0) throw ApiError.badRequest('Empty file.');
  if (buffer.length > MAX_UPLOAD_BYTES) throw ApiError.tooLarge();
  const header = buffer.subarray(0, 5).toString('latin1');
  if (header !== '%PDF-') {
    throw ApiError.badRequest(`"${originalName}" is not a valid PDF (missing %PDF- header).`);
  }
  const tail = buffer.subarray(Math.max(0, buffer.length - 2048)).toString('latin1');
  if (!tail.includes('%%EOF')) {
    throw ApiError.badRequest(`"${originalName}" is not a valid PDF (missing %%EOF trailer).`);
  }
  return true;
}

module.exports = { validatePdfBuffer };
