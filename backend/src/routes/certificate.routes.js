const router = require('express').Router();
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const upload = require('../middleware/upload');
const { uploadLimiter } = require('../middleware/rateLimiter');
const { ROLES } = require('../config/constants');
const ctrl = require('../controllers/certificate.controller');

// Issuance management is a university-only surface.
router.use(authenticate, requireRole(ROLES.UNIVERSITY));

router.get('/', ctrl.listCertificates);

// multer must parse the multipart body BEFORE express-validator reads the fields.
router.post(
  '/',
  uploadLimiter,
  upload.single('pdf'),
  [
    body('studentName').isString().trim().isLength({ min: 1, max: 120 }).withMessage('studentName is required'),
    body('studentEmail').isEmail().withMessage('a valid studentEmail is required'),
    body('program').isString().trim().isLength({ min: 1, max: 150 }).withMessage('program is required'),
    body('degree').isString().trim().isLength({ min: 1, max: 150 }).withMessage('degree is required'),
  ],
  validate,
  ctrl.uploadCertificate
);

const uuidRule = param('id').isUUID(4).withMessage('invalid certificate id');
const txHashRule = body('txHash')
  .isString()
  .matches(/^0x[0-9a-fA-F]{64}$/)
  .withMessage('a valid transaction hash is required');

router.get('/:id', [uuidRule], validate, ctrl.getCertificate);

router.post('/:id/confirm', [uuidRule, txHashRule], validate, ctrl.confirmIssuance);

router.post(
  '/:id/revoke',
  [uuidRule, txHashRule, body('reason').optional({ nullable: true }).isString().trim().isLength({ max: 500 })],
  validate,
  ctrl.revokeCertificate
);

module.exports = router;
