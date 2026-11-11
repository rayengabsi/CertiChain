/**
 * Typed API error — the central error handler turns these into clean JSON responses.
 * Never leak stack traces or internals to clients.
 */
class ApiError extends Error {
  constructor(statusCode, code, message) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
  static badRequest(msg) { return new ApiError(400, 'BAD_REQUEST', msg); }
  static unauthorized(msg = 'Authentication required.') { return new ApiError(401, 'UNAUTHORIZED', msg); }
  static forbidden(msg = 'Forbidden.') { return new ApiError(403, 'FORBIDDEN', msg); }
  static notFound(msg = 'Not found.') { return new ApiError(404, 'NOT_FOUND', msg); }
  static conflict(msg) { return new ApiError(409, 'CONFLICT', msg); }
  static tooLarge(msg = 'File exceeds the size limit.') { return new ApiError(413, 'PAYLOAD_TOO_LARGE', msg); }
  static chain(msg = 'Blockchain interaction failed.') { return new ApiError(502, 'CHAIN_ERROR', msg); }
}

module.exports = ApiError;
