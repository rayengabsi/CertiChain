const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const ctrl = require('../controllers/auth.controller');

router.post(
  '/login',
  authLimiter,
  [
    body('email').isEmail().withMessage('a valid email is required').normalizeEmail(),
    body('password').isString().isLength({ min: 8, max: 128 }).withMessage('password is required'),
  ],
  validate,
  ctrl.login
);

router.get('/me', authenticate, ctrl.me);

module.exports = router;
