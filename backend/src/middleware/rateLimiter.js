const rateLimit = require('express-rate-limit');
const cfg = require('../config/env');

const base = { standardHeaders: true, legacyHeaders: false };
const message = (msg) => ({ error: { code: 'RATE_LIMITED', message: msg } });

/** Limits are configured in env.js so the test suite can exercise the 429 path. */
const globalLimiter = rateLimit({ ...base, windowMs: 15 * 60 * 1000, limit: cfg.RATE_LIMIT_GLOBAL, message: message('Too many requests, slow down.') });
const authLimiter = rateLimit({ ...base, windowMs: 15 * 60 * 1000, limit: cfg.RATE_LIMIT_AUTH, message: message('Too many login attempts. Try again later.') });
const verifyLimiter = rateLimit({ ...base, windowMs: 60 * 1000, limit: cfg.RATE_LIMIT_VERIFY, message: message('Too many verification requests.') });
const uploadLimiter = rateLimit({ ...base, windowMs: 60 * 60 * 1000, limit: cfg.RATE_LIMIT_UPLOAD, message: message('Upload limit reached.') });

module.exports = { globalLimiter, authLimiter, verifyLimiter, uploadLimiter };
