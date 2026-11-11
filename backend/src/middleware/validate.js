const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

/** Turn express-validator failures into a single clean 400. */
module.exports = function validate(req, _res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const message = errors.array().map((e) => `${e.path}: ${e.msg}`).join('; ');
    return next(ApiError.badRequest(message));
  }
  next();
};
