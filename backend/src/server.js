const app = require('./app');
const { connectDb } = require('./config/db');
const { PORT, NODE_ENV, CONTRACT_ADDRESS, RPC_URL } = require('./config/env');

(async () => {
  try {
    await connectDb();
    app.listen(PORT, () => {
      console.log('');
      console.log(`  CertiChain API listening on http://localhost:${PORT}  (${NODE_ENV})`);
      console.log(`  Chain:    ${RPC_URL}`);
      console.log(`  Contract: ${CONTRACT_ADDRESS}`);
      console.log(`  Health:   http://localhost:${PORT}/api/health`);
      console.log('');
    });
  } catch (err) {
    console.error('[server] FATAL: could not start:', err.message);
    process.exit(1);
  }
})();
