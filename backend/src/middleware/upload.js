const multer = require('multer');
const ApiError = require('../utils/ApiError');
const { MAX_UPLOAD_BYTES } = require('../config/env');

/**
 * Upload pipeline: memory storage so we can validate the buffer (magic bytes, size)
 * BEFORE anything is written to disk. The stored file gets a random server-generated
 * name — client filenames never touch the filesystem (path traversal impossible).
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (file.fieldname !== 'pdf') return cb(ApiError.badRequest('Unexpected upload field.'));
    if (file.mimetype !== 'application/pdf') return cb(ApiError.badRequest('Only PDF files are accepted.'));
    cb(null, true);
  },
});

module.exports = upload;
