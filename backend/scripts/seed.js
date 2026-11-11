/**
 * Creates (or resets) the platform admin account from .env.
 *   npm run seed
 *
 * The admin account authenticates the CertiChain dashboard. On-chain, the admin's
 * MetaMask wallet (Hardhat account #0 on the local chain) holds DEFAULT_ADMIN_ROLE.
 */
const bcrypt = require('bcryptjs');
const { connectDb, mongoose } = require('../src/config/db');
const User = require('../src/models/User');
const { ADMIN_EMAIL, ADMIN_PASSWORD, BCRYPT_ROUNDS } = require('../src/config/env');
const { ROLES } = require('../src/config/constants');

(async () => {
  try {
    await connectDb();
    const email = String(ADMIN_EMAIL).toLowerCase().trim();
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, BCRYPT_ROUNDS);

    const existing = await User.findOne({ email }).select('+passwordHash');
    if (existing) {
      existing.passwordHash = passwordHash;
      existing.role = ROLES.ADMIN;
      existing.active = true;
      await existing.save();
      console.log(`[seed] admin account updated: ${email}`);
    } else {
      await User.create({ email, passwordHash, role: ROLES.ADMIN, fullName: 'CertiChain Administrator' });
      console.log(`[seed] admin account created: ${email}`);
    }
    console.log('[seed] done. Log in with the ADMIN_EMAIL / ADMIN_PASSWORD from backend/.env');
  } catch (err) {
    console.error('[seed] failed:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
})();
