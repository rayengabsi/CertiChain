/**
 * Test bootstrap — runs BEFORE any module is imported (jest setupFiles).
 *
 * Safety: tests use a SEPARATE database (certichain_test) so the demo data in
 * certichain is never touched. dotenv does not override already-set variables,
 * so these values win over backend/.env.
 */
process.env.NODE_ENV = 'test';
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/certichain_test';
process.env.JWT_SECRET = 'test-only-secret-0123456789abcdef0123456789abcdef0123456789abcdef0123456789ab';
process.env.JWT_EXPIRES_IN = '8h';
process.env.CONTRACT_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
process.env.CHAIN_ID = '31337';
process.env.RPC_URL = 'http://127.0.0.1:8545';
process.env.BCRYPT_ROUNDS = '4'; // fast tests; production uses 12
process.env.MAX_UPLOAD_BYTES = '1048576'; // 1 MB so the 413 test is quick
process.env.RATE_LIMIT_GLOBAL = '10000';
process.env.RATE_LIMIT_AUTH = '10000'; // the dedicated rate-limit test overrides this
process.env.RATE_LIMIT_VERIFY = '10000';
process.env.RATE_LIMIT_UPLOAD = '10000';
process.env.PUBLIC_BASE_URL = 'http://localhost:5173';
