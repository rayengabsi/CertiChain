/**
 * READ-ONLY blockchain access.
 *
 * Security-critical design decision: this service has NO signer and NO private keys.
 * - Verification queries use eth_call (getCertificate / verify / isIssuerAuthorized).
 * - parseTransaction() reads transaction receipts and parses the contract's events —
 *   this is how the backend verifies frontend-claimed MetaMask transactions
 *   ("never trust the client").
 */
const { ethers } = require('ethers');
const abi = require('../config/certificateRegistry.abi.json');
const { RPC_URL, CONTRACT_ADDRESS } = require('../config/env');
const ApiError = require('../utils/ApiError');

const provider = new ethers.JsonRpcProvider(RPC_URL);
const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, provider);

const ISSUER_ROLE = ethers.id('ISSUER_ROLE'); // keccak256("ISSUER_ROLE")
const DEFAULT_ADMIN_ROLE = ethers.ZeroHash; // AccessControl.DEFAULT_ADMIN_ROLE

/** UUID v4 string → bytes32 (hex digits zero-padded). Deterministic and bijective. */
function certIdToBytes32(uuid) {
  const clean = String(uuid || '').replace(/-/g, '').toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(clean)) throw ApiError.badRequest('Invalid certificate ID format.');
  return '0x' + clean.padEnd(64, '0');
}

/** 64-char hex SHA-256 → bytes32. */
function sha256ToBytes32(hex) {
  const clean = String(hex || '').replace(/^0x/, '').toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(clean)) throw ApiError.badRequest('Invalid SHA-256 format.');
  return '0x' + clean;
}

const lower = (v) => String(v).toLowerCase();

async function getCertificateOnChain(certificateId) {
  const result = await contract.getCertificate(certIdToBytes32(certificateId));
  return {
    exists: result.exists === true,
    issuer: String(result.issuer),
    fingerprint: String(result.fingerprint),
    issuedAt: Number(result.issuedAt),
    revokedAt: Number(result.revokedAt),
  };
}

async function verifyOnChain(certificateId, sha256) {
  return (await contract.verify(certIdToBytes32(certificateId), sha256ToBytes32(sha256))) === true;
}

async function isIssuerAuthorized(address) {
  return (await contract.isIssuerAuthorized(address)) === true;
}

async function hasAdminRole(address) {
  return (await contract.hasRole(DEFAULT_ADMIN_ROLE, address)) === true;
}

/**
 * Read a transaction receipt and parse our contract's events from it.
 * THE core of the "never trust the client" design — every confirm endpoint uses this.
 * Returns { txHash, status, blockNumber, from, to, events: [{ name, args }] } with
 * all event args as lowercase strings (safe comparisons).
 */
async function parseTransaction(txHash) {
  if (!/^0x[0-9a-fA-F]{64}$/.test(String(txHash || ''))) {
    throw ApiError.badRequest('Invalid transaction hash format.');
  }
  let receipt = null;
  try {
    receipt = await provider.waitForTransaction(txHash, 1, 60_000);
  } catch {
    throw ApiError.chain('Transaction not found on chain (or RPC unavailable).');
  }
  if (!receipt) throw ApiError.chain('Transaction not found on chain.');

  const events = receipt.logs
    .map((log) => {
      try {
        return contract.interface.parseLog({ topics: [...log.topics], data: log.data });
      } catch {
        return null; // a log from another contract — ignored
      }
    })
    .filter(Boolean)
    .map((e) => {
      const args = {};
      for (const key of Object.keys(e.args)) {
        if (isNaN(Number(key))) args[key] = lower(String(e.args[key]));
      }
      return { name: e.name, args };
    });

  return {
    txHash,
    status: Number(receipt.status),
    blockNumber: Number(receipt.blockNumber),
    from: lower(String(receipt.from)),
    to: lower(String(receipt.to)),
    events,
  };
}

module.exports = {
  provider,
  contract,
  certIdToBytes32,
  sha256ToBytes32,
  getCertificateOnChain,
  verifyOnChain,
  isIssuerAuthorized,
  hasAdminRole,
  parseTransaction,
  ISSUER_ROLE,
  DEFAULT_ADMIN_ROLE,
};
