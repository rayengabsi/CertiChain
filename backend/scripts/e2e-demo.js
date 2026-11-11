/**
 * CertiChain end-to-end demo (real local blockchain + real API + real MongoDB).
 *
 *   npm run e2e        (from backend/ — requires: mongod running, hardhat node running,
 *                       contract deployed, backend server NOT required: this script uses the API over HTTP,
 *                       so start the API first with `npm start`)
 *
 * What it proves (each step is asserted):
 *   1. admin logs in and registers a university (wallet address)
 *   2. the ADMIN WALLET signs authorizeIssuer() ON-CHAIN; the backend verifies the receipt
 *   3. the university uploads a PDF; the BACKEND computes SHA-256 server-side
 *   4. the UNIVERSITY WALLET signs issue() ON-CHAIN; the backend verifies the event
 *   5. public verification by ID → VALID; by file → VALID
 *   6. one-byte tampering → NOT FOUND (never VALID)
 *   7. the university signs revoke() ON-CHAIN → verification reports REVOKED
 *   8. a DEAUTHORIZED university is rejected by the CONTRACT ITSELF (bypassing the API)
 *
 * NOTE: the wallets here are Hardhat's public development accounts. This is how the
 * script simulates exactly what MetaMask signs in the browser — no private key ever
 * lives in the backend.
 */
require('dotenv').config({ path: require('node:path').resolve(__dirname, '../.env') });
const { ethers } = require('ethers');
const crypto = require('node:crypto');
const abi = require('../src/config/certificateRegistry.abi.json');

const API = process.env.API_URL || 'http://127.0.0.1:5000';
const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:8545';
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// Hardhat development accounts — PUBLIC test keys (documented, local-only, never for Sepolia).
const ADMIN_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; // account #0 (contract admin)
const UNI_KEY = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d'; // account #1 (university)

const UNI_NAME = 'Demo University of Blockchain';
const UNI_EMAIL = 'university@demo.local';
const UNI_PASSWORD = 'Demo-University-123';

let failures = 0;
function check(label, condition, extra = '') {
  const ok = Boolean(condition);
  if (!ok) failures += 1;
  console.log(`${ok ? '  PASS' : '  FAIL'}  ${label}${extra ? `  [${extra}]` : ''}`);
  return ok;
}
function step(title) {
  console.log(`\n── ${title} ${'─'.repeat(Math.max(0, 60 - title.length))}`);
}

// ── helpers ─────────────────────────────────────────────────────────────────
async function api(method, path, { token, body, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) payload = form;
  else if (body) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(`${API}${path}`, { method, headers, body: payload });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: res.status, body: json };
}

/** A genuinely valid, openable one-page PDF (unique per run via the nonce). */
function buildDiplomaPdf(nonce) {
  const stream =
    `BT /F1 20 Tf 72 760 Td (CertiChain Demo Diploma) Tj ET\n` +
    `BT /F1 12 Tf 72 730 Td (Nonce: ${nonce}) Tj ET\n` +
    `BT /F1 12 Tf 72 710 Td (This document is anchored by SHA-256 on the blockchain.) Tj ET\n`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}endstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [];
  objects.forEach((obj, i) => {
    offsets.push(Buffer.byteLength(pdf, 'latin1'));
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) pdf += `${String(off).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1');
}

async function uploadCertificate(token, buffer, fields) {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  form.append('pdf', new Blob([buffer], { type: 'application/pdf' }), 'diploma.pdf');
  return api('POST', '/api/certificates', { token, form });
}

async function verifyFile(buffer) {
  const form = new FormData();
  form.append('pdf', new Blob([buffer], { type: 'application/pdf' }), 'check.pdf');
  return api('POST', '/api/verify/file', { form });
}

async function main() {
  console.log('CertiChain end-to-end demo');
  console.log(`API ${API} · RPC ${RPC_URL} · contract ${CONTRACT_ADDRESS}`);

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  // NonceManager: ethers v6 caches eth_getTransactionCount for ~250 ms, which can
  // reuse a nonce when several transactions are sent back-to-back by one wallet.
  const adminWallet = new ethers.NonceManager(new ethers.Wallet(ADMIN_KEY, provider));
  const uniWallet = new ethers.NonceManager(new ethers.Wallet(UNI_KEY, provider));
  const registryAdmin = new ethers.Contract(CONTRACT_ADDRESS, abi, adminWallet);
  const registryUni = new ethers.Contract(CONTRACT_ADDRESS, abi, uniWallet);
  const uniAddress = await uniWallet.getAddress();

  // 1 — health & admin login
  step('1. Service health & admin authentication');
  const health = await api('GET', '/api/health');
  check('API health is ok', health.status === 200 && health.body.status === 'ok');
  check('backend can reach the chain', health.body.blockchain?.connected === true);

  const adminLogin = await api('POST', '/api/auth/login', { body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } });
  check('admin login', adminLogin.status === 200 && adminLogin.body.user.role === 'admin');
  const adminToken = adminLogin.body.token;

  // 2 — register the university
  step('2. Admin registers the university (wallet ' + uniAddress + ')');
  let uniId;
  const created = await api('POST', '/api/admin/universities', {
    token: adminToken,
    body: { name: UNI_NAME, ethAddress: uniAddress, email: UNI_EMAIL, password: UNI_PASSWORD },
  });
  if (created.status === 201) {
    uniId = created.body.university.id;
    check('university created', true, uniId);
  } else {
    const list = await api('GET', '/api/admin/universities', { token: adminToken });
    const found = (list.body.universities || []).find((u) => u.ethAddress.toLowerCase() === uniAddress.toLowerCase());
    uniId = found?.id;
    check('university already registered (re-run)', Boolean(uniId), uniId);
  }

  // 3 — admin authorizes the university ON-CHAIN (admin wallet signs)
  step('3. Admin wallet signs authorizeIssuer() on-chain');
  const authTx = await registryAdmin.authorizeIssuer(uniAddress);
  const authRc = await authTx.wait();
  check('authorizeIssuer transaction mined', authRc.status === 1, authTx.hash);

  const confirmAuth = await api('POST', `/api/admin/universities/${uniId}/confirm-authorization`, {
    token: adminToken,
    body: { txHash: authTx.hash },
  });
  check('backend verified the on-chain role change', confirmAuth.status === 200 && confirmAuth.body.university.authorized === true);

  // 4 — university login + upload
  step('4. University uploads a diploma PDF (backend computes SHA-256)');
  const uniLogin = await api('POST', '/api/auth/login', { body: { email: UNI_EMAIL, password: UNI_PASSWORD } });
  check('university login', uniLogin.status === 200 && uniLogin.body.user.role === 'university');
  const uniToken = uniLogin.body.token;

  const pdf = buildDiplomaPdf(crypto.randomUUID());
  const localSha256 = crypto.createHash('sha256').update(pdf).digest('hex');
  const upload = await uploadCertificate(uniToken, pdf, {
    studentName: 'Amina Ben Salah',
    studentEmail: 'amina@example.edu',
    program: 'Computer Science',
    degree: 'Licence (BSc)',
  });
  check('upload accepted (201)', upload.status === 201, upload.body.error?.message);
  check('server-side SHA-256 equals the locally computed hash', upload.body.sha256 === localSha256);
  const { certificateId, sha256, certIdBytes32, fingerprintBytes32 } = upload.body;

  // 5 — university signs issue() ON-CHAIN
  step('5. University wallet signs issue() on-chain');
  const issueTx = await registryUni.issue(certIdBytes32, fingerprintBytes32);
  const issueRc = await issueTx.wait();
  check('issue transaction mined', issueRc.status === 1, issueTx.hash);

  const confirmIssue = await api('POST', `/api/certificates/${certificateId}/confirm`, {
    token: uniToken,
    body: { txHash: issueTx.hash },
  });
  check('backend verified the CertificateIssued event', confirmIssue.status === 200 && confirmIssue.body.certificate.status === 'issued');

  const onChain = await registryAdmin.getCertificate(certIdBytes32);
  check('chain stores the certificate', onChain.exists === true);
  check('chain fingerprint matches the document', onChain.fingerprint === fingerprintBytes32);
  check('chain issuer is the university wallet', onChain.issuer.toLowerCase() === uniAddress.toLowerCase());

  // 6 — public verification
  step('6. Public verification (no authentication)');
  const byId = await api('GET', `/api/verify/${certificateId}`);
  check('verify by ID → VALID', byId.status === 200 && byId.body.status === 'valid');
  check('no student PII in the public response', !JSON.stringify(byId.body).includes('amina@example.edu') && byId.body.studentName === undefined);

  const byFile = await verifyFile(pdf);
  check('verify by file → VALID', byFile.status === 200 && byFile.body.status === 'valid');

  const tampered = Buffer.concat([pdf.subarray(0, 60), Buffer.from('X'), pdf.subarray(60)]);
  const tamperedRes = await verifyFile(tampered);
  check('tampered file is never VALID', tamperedRes.body.status === 'not_found', `status=${tamperedRes.body.status}`);

  // 7 — revocation
  step('7. University wallet signs revoke() on-chain');
  const revokeTx = await registryUni.revoke(certIdBytes32);
  const revokeRc = await revokeTx.wait();
  check('revoke transaction mined', revokeRc.status === 1, revokeTx.hash);

  const revoke = await api('POST', `/api/certificates/${certificateId}/revoke`, {
    token: uniToken,
    body: { txHash: revokeTx.hash, reason: 'Demonstration revocation' },
  });
  check('backend verified the CertificateRevoked event', revoke.status === 200 && revoke.body.certificate.status === 'revoked');

  const afterRevoke = await api('GET', `/api/verify/${certificateId}`);
  check('verify by ID → REVOKED', afterRevoke.body.status === 'revoked');

  // 8 — on-chain enforcement (bypassing the API entirely)
  step('8. On-chain enforcement: a deauthorized university cannot issue');
  const deauthTx = await registryAdmin.deauthorizeIssuer(uniAddress);
  await deauthTx.wait();
  const confirmDeauth = await api('POST', `/api/admin/universities/${uniId}/confirm-deauthorization`, {
    token: adminToken,
    body: { txHash: deauthTx.hash },
  });
  check('deauthorization confirmed', confirmDeauth.status === 200 && confirmDeauth.body.university.authorized === false);

  let reverted = false;
  let enforcement = 'no revert (UNEXPECTED)';
  try {
    // staticCall performs the state check WITHOUT sending a transaction — the cleanest
    // way to prove the contract itself refuses the call (no gas, no nonce, no state change).
    const illegalId = ethers.hexlify(ethers.randomBytes(32));
    await registryUni.issue.staticCall(illegalId, fingerprintBytes32);
  } catch (err) {
    reverted = err.code === 'CALL_EXCEPTION' || /revert|unauthorized/i.test(String(err.shortMessage || err.message));
    enforcement = err.revert?.name || err.shortMessage || err.code || 'reverted';
  }
  check('contract REJECTS issuance by a deauthorized wallet (ISSUER_ROLE enforced on-chain)', reverted, enforcement);

  // restore a working state for the UI demo
  step('9. Restoring authorization for the UI demo');
  const reauthTx = await registryAdmin.authorizeIssuer(uniAddress);
  await reauthTx.wait();
  const confirmReauth = await api('POST', `/api/admin/universities/${uniId}/confirm-authorization`, {
    token: adminToken,
    body: { txHash: reauthTx.hash },
  });
  check(
    'university re-authorized',
    confirmReauth.status === 200 && confirmReauth.body?.university?.authorized === true
  );

  // summary
  console.log('\n══════════════════════════════════════════════════════════');
  console.log(failures === 0 ? '  E2E DEMO: ALL CHECKS PASSED' : `  E2E DEMO: ${failures} CHECK(S) FAILED`);
  console.log('══════════════════════════════════════════════════════════');
  console.log(`  certificateId: ${certificateId}`);
  console.log(`  SHA-256:       ${sha256}`);
  console.log(`  issue tx:      ${issueTx.hash}`);
  console.log(`  revoke tx:     ${revokeTx.hash}`);
  console.log(`  public URL:    ${process.env.PUBLIC_BASE_URL || 'http://localhost:5173'}/verify/${certificateId}`);
  console.log('');
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((err) => {
  console.error('\nE2E demo crashed:', err);
  process.exitCode = 1;
});
