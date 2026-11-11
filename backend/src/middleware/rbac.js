const ApiError = require('../utils/ApiError');

/** Role-based access control — roles come from the SIGNED JWT, never from the request body. */
const requireRole = (...roles) => (req, _res, next) => {
  try {
    if (!req.user) throw ApiError.unauthorized();
    if (!roles.includes(req.user.role)) throw ApiError.forbidden('Insufficient role for this action.');
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { requireRole };
