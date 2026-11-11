const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema(
  {
    certificateId: { type: String, required: true, unique: true }, // UUID v4 (non-identifying public reference)
    sha256: { type: String, required: true, unique: true },        // ONE PDF = ONE certificate
    universityId: { type: mongoose.Schema.Types.ObjectId, ref: 'University', required: true },
    studentName: { type: String, required: true, trim: true, maxlength: 120 }, // off-chain PII
    studentEmail: { type: String, required: true, trim: true, lowercase: true, match: [/^\S+@\S+\.\S+$/, 'Invalid email'] },
    program: { type: String, required: true, trim: true, maxlength: 150 },
    degree: { type: String, required: true, trim: true, maxlength: 150 },
    fileName: { type: String, required: true, trim: true, maxlength: 200 }, // original name, display only
    storedFile: { type: String, required: true, select: false },           // server path (random name)
    sizeBytes: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'issued', 'revoked'], default: 'pending' },
    issueTxHash: { type: String, default: null },
    issueBlock: { type: Number, default: null },
    issuedAt: { type: Date, default: null }, // chain timestamp
    revokedAt: { type: Date, default: null },
    revokeTxHash: { type: String, default: null },
    revokeReason: { type: String, default: null, maxlength: 500 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Certificate', certificateSchema);
