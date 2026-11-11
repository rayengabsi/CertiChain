const multer = require('multer');
const ApiError = require('../utils/ApiError');

/** Central error handler — clean JSON out, stack traces only in the server console. */
function errorHandler(err, _req, res, _next) {
  if (err instanceof multer.MulterError) {
    const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    const msg = err.code === 'LIMIT_FILE_SIZE' ? 'File exceeds the 10 MB limit.' : 'Upload error.';
    return res.status(status).json({ error: { code: err.code, message: msg } });
  }
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ error: { code: err.code, message: err.message } });
  }
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body too large.' } });
  }
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'BAD_JSON', message: 'Malformed JSON body.' } });
  }
  console.error('[error]', err);
  return res.status(500).json({ error: { code: 'INTERNAL', message: 'Internal server error.' } });
}

module.exports = errorHandler;
