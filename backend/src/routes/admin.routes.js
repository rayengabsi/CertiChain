const router = require('express').Router();
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { ROLES } = require('../config/constants');
const ctrl = require('../controllers/admin.controller');

// Every admin route requires a valid JWT with role=admin (role comes from the signed token).
router.use(authenticate, requireRole(ROLES.ADMIN));

const txHashRule = body('txHash')
  .isString()
  .matches(/^0x[0-9a-fA-F]{64}$/)
  .withMessage('a valid transaction hash is required');

router.get('/universities', ctrl.listUniversities);

router.post(
  '/universities',
  [
    body('name').isString().trim().isLength({ min: 2, max: 150 }).withMessage('name must be 2-150 characters'),
    body('ethAddress')
      .isString()
      .matches(/^0x[0-9a-fA-F]{40}$/)
      .withMessage('ethAddress must be a valid 0x wallet address'),
    body('email').isEmail().withMessage('a valid email is required').normalizeEmail(),
    body('password').isString().isLength({ min: 10, max: 128 }).withMessage('password must be at least 10 characters'),
    body('fullName').optional({ nullable: true }).isString().trim().isLength({ max: 120 }),
  ],
  validate,
  ctrl.createUniversity
);

router.post(
  '/universities/:id/confirm-authorization',
  [param('id').isMongoId().withMessage('invalid university id'), txHashRule],
  validate,
  ctrl.confirmAuthorization
);

router.post(
  '/universities/:id/confirm-deauthorization',
  [param('id').isMongoId().withMessage('invalid university id'), txHashRule],
  validate,
  ctrl.confirmDeauthorization
);

router.get('/activity', ctrl.getActivity);

module.exports = router;
