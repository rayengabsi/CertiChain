const router = require('express').Router();
const upload = require('../middleware/upload');
const { verifyLimiter } = require('../middleware/rateLimiter');
const ctrl = require('../controllers/verify.controller');

// PUBLIC surface — no authentication. Rate-limited, strictly validated,
// and the responses never contain student personal data.

router.get('/:certificateId', verifyLimiter, ctrl.verifyById);

router.post('/file', verifyLimiter, upload.single('pdf'), ctrl.verifyByFile);

module.exports = router;
