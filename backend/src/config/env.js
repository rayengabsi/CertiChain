/**
 * Central environment configuration — validated ONCE at boot, fails fast.
 */
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function required(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`[config] FATAL: missing required environment variable ${name} (see .env.example)`);
    process.exit(1);
  }
  return value;
}

const config = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  MONGO_URI: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/certichain',
  JWT_SECRET: required('JWT_SECRET'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '8h',
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
  MAX_UPLOAD_BYTES: parseInt(process.env.MAX_UPLOAD_BYTES || String(10 * 1024 * 1024), 10),
  RPC_URL: process.env.RPC_URL || 'http://127.0.0.1:8545',
  CHAIN_ID: parseInt(process.env.CHAIN_ID || '31337', 10),
  CONTRACT_ADDRESS: required('CONTRACT_ADDRESS'),
  FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL || 'http://localhost:5173',
  // Rate limits (requests per window). Overridable so tests can exercise the 429 path.
  RATE_LIMIT_GLOBAL: parseInt(process.env.RATE_LIMIT_GLOBAL || '300', 10),
  RATE_LIMIT_AUTH: parseInt(process.env.RATE_LIMIT_AUTH || '10', 10),
  RATE_LIMIT_VERIFY: parseInt(process.env.RATE_LIMIT_VERIFY || '60', 10),
  RATE_LIMIT_UPLOAD: parseInt(process.env.RATE_LIMIT_UPLOAD || '30', 10),
  // Seed admin account (npm run seed)
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@certichain.local',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'CertiChain-Admin-2026!',
};

module.exports = config;
