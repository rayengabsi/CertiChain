const mongoose = require('mongoose');

/** Append-only audit trail. There are NO update/delete code paths for this collection. */
const auditLogSchema = new mongoose.Schema(
  {
    actorEmail: { type: String, default: 'anonymous' },
    actorRole: { type: String, default: null },
    action: { type: String, required: true },
    target: { type: String, default: null },
    ip: { type: String, default: null },
    result: { type: String, enum: ['success', 'failure'], default: 'success' },
    details: { type: String, default: '' }, // sanitized — never passwords, tokens, keys or file bytes
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

module.exports = mongoose.model('AuditLog', auditLogSchema);
