const AuditLog = require('../models/AuditLog');

/**
 * Fire-and-forget audit write.
 * Logged: actor, role, action, target, ip, result.
 * NEVER logged: passwords, tokens, keys, file bytes, or more PII than necessary.
 */
function audit({ actorEmail = 'anonymous', actorRole = null, action, target = null, ip = null, result = 'success', details = '' }) {
  AuditLog.create({
    actorEmail,
    actorRole,
    action,
    target,
    ip,
    result,
    details: String(details).slice(0, 500),
  }).catch((err) => console.error('[audit] write failed:', err.message));
}

module.exports = { audit };
