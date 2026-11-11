const mongoose = require('mongoose');

const universitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true, minlength: 2, maxlength: 150 },
    ethAddress: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      validate: { validator: (v) => /^0x[0-9a-f]{40}$/.test(v), message: 'Invalid Ethereum wallet address.' },
    },
    authorized: { type: Boolean, default: false }, // mirror of the on-chain ISSUER_ROLE
    authorizedAt: { type: Date, default: null },
    deauthorizedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('University', universitySchema);
