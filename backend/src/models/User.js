const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, match: [/^\S+@\S+\.\S+$/, 'Invalid email'] },
    passwordHash: { type: String, required: true, select: false }, // never selected by default
    role: { type: String, enum: ['admin', 'university'], required: true },
    universityId: { type: mongoose.Schema.Types.ObjectId, ref: 'University', default: null },
    fullName: { type: String, trim: true, maxlength: 120 },
    active: { type: Boolean, default: true },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true }
);

/** Never expose password hashes in API responses. */
userSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
