const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');
const { JWT_SECRET } = require('../config/env');

/** Verify the Bearer token (HS256 only — algorithm confusion is not possible) and attach req.user. */
module.exports = function authenticate(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw ApiError.unauthorized();

    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    } catch {
      throw ApiError.unauthorized('Invalid or expired token.');
    }

    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      universityId: payload.universityId || null,
    };
    next();
  } catch (err) {
    next(err);
  }
};
