const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const University = require('../models/University');
const ApiError = require('../utils/ApiError');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/env');
const { audit } = require('../services/audit.service');

/** Sign a short-lived JWT. Roles live in the SIGNED token — never trusted from the client. */
function signToken(user) {
  return jwt.sign(
    {
      email: user.email,
      role: user.role,
      universityId: user.universityId ? String(user.universityId) : null,
    },
    JWT_SECRET,
    { subject: String(user._id), expiresIn: JWT_EXPIRES_IN, algorithm: 'HS256' }
  );
}

/**
 * POST /api/auth/login  (rate-limited)
 * Generic failure message on purpose: no user enumeration.
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select('+passwordHash');

    const invalid = () => {
      audit({ actorEmail: email, action: 'auth.login', ip: req.ip, result: 'failure', details: 'invalid credentials' });
      throw ApiError.unauthorized('Invalid email or password.');
    };

    if (!user) return next(invalid());
    if (!user.active) {
      audit({ actorEmail: email, action: 'auth.login', ip: req.ip, result: 'failure', details: 'account disabled' });
      return next(ApiError.forbidden('This account is disabled.'));
    }
    if (!(await bcrypt.compare(password, user.passwordHash))) return next(invalid());

    user.lastLoginAt = new Date();
    await user.save();

    audit({ actorEmail: user.email, actorRole: user.role, action: 'auth.login', ip: req.ip, result: 'success' });

    return res.json({
      token: signToken(user),
      user: {
        id: String(user._id),
        email: user.email,
        role: user.role,
        fullName: user.fullName || null,
        universityId: user.universityId ? String(user.universityId) : null,
      },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/auth/me — current identity, re-read from the database so the
 * university's authorization mirror is always fresh for the dashboard.
 */
async function me(req, res, next) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) throw ApiError.unauthorized('Account no longer exists.');

    let university = null;
    if (user.universityId) {
      const uni = await University.findById(user.universityId);
      if (uni) {
        university = {
          id: String(uni._id),
          name: uni.name,
          ethAddress: uni.ethAddress,
          authorized: uni.authorized,
        };
      }
    }

    return res.json({
      user: {
        id: String(user._id),
        email: user.email,
        role: user.role,
        fullName: user.fullName || null,
        universityId: user.universityId ? String(user.universityId) : null,
      },
      university,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { login, me };
