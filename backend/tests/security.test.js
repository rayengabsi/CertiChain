/**
 * CertiChain backend security & lifecycle tests (docs/04-security.md §7).
 * Real local MongoDB (certichain_test) + the REAL Express app; only the
 * blockchain service is mocked (we cannot mine transactions inside Jest).
 *
 * Run: npm test
 */
const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('node:path');
const fsp = require('node:fs/promises');
const crypto = require('node:crypto');

jest.mock('../src/services/blockchain.service', () => {
  const actual = jest.requireActual('../src/services/blockchain.service');
  return {
    ...actual,
    provider: { getBlockNumber: jest.fn(async () => 42) },
    getCertificateOnChain: jest.fn(),
    verifyOnChain: jest.fn(),
    isIssuerAuthorized: jest.fn(),
    hasAdminRole: jest.fn(),
    parseTransaction: jest.fn(),
  };
});

const app = require('../src/app');
const chain = require('../src/services/blockchain.service');
const realChain = jest.requireActual('../src/services/blockchain.service');
const { connectDb, mongoose } = require('../src/config/db');
const User = require('../src/models/User');
const University = require('../src/models/University');
const Certificate = require('../src/models/Certificate');
const AuditLog = require('../src/models/AuditLog');
const ApiError = require('../src/utils/ApiError');
const { JWT_SECRET, CONTRACT_ADDRESS } = require('../src/config/env');

// ── fixtures ────────────────────────────────────────────────────────────────
const ADMIN_EMAIL = 'admin@test.local';
const ADMIN_PASSWORD = 'Admin-Password-123';
const UNI_A_EMAIL = 'uni-a@test.local';
const UNI_B_EMAIL = 'uni-b@test.local';
const UNI_PASSWORD = 'Uni-Password-123';
const ETH_ADMIN = '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266';
const ETH_A = '0x70997970c51812dc3a010c7d01b50e0d17dc79c8';
const ETH_B = '0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc';
const CONTRACT = CONTRACT_ADDRESS.toLowerCase();
const TX = '0x' + 'ab'.repeat(32);
const ZERO_ADDR = '0x0000000000000000000000000000000000000000';
const ZERO_HASH = '0x' + '00'.repeat(32);

const auth = (t) => ({ Authorization: `Bearer ${t}` });
const nowSec = () => Math.floor(Date.now() / 1000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Unique PDF each call (a random tag changes the bytes → unique SHA-256). */
function makePdf(tag = crypto.randomUUID()) {
  return Buffer.from(
    `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /CertiChain (${tag}) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n`
  );
}

function receipt({ from = ETH_ADMIN, to = CONTRACT, events = [], status = 1, blockNumber = 7 } = {}) {
  return { txHash: TX, status, blockNumber, from: String(from).toLowerCase(), to: String(to).toLowerCase(), events };
}

const authReceipt = (eth) =>
  receipt({
    from: ETH_ADMIN,
    events: [{ name: 'IssuerAuthorized', args: { issuer: eth.toLowerCase(), authorizedBy: ETH_ADMIN, timestamp: String(nowSec()) } }],
  });

const issuanceReceipt = (cert, eth) =>
  receipt({
    from: eth,
    events: [
      {
        name: 'CertificateIssued',
        args: {
          certificateId: realChain.certIdToBytes32(cert.certificateId),
          issuer: eth.toLowerCase(),
          fingerprint: realChain.sha256ToBytes32(cert.sha256),
          timestamp: String(nowSec()),
        },
      },
    ],
  });

const revocationReceipt = (cert, eth) =>
  receipt({
    from: eth,
    events: [
      {
        name: 'CertificateRevoked',
        args: { certificateId: realChain.certIdToBytes32(cert.certificateId), revokedBy: eth.toLowerCase(), timestamp: String(nowSec()) },
      },
    ],
  });

const chainCert = ({ sha256, issuer = ETH_A, revokedAt = 0, exists = true }) => ({
  exists,
  issuer,
  fingerprint: realChain.sha256ToBytes32(sha256),
  issuedAt: nowSec(),
  revokedAt,
});

/** multipart upload helper */
function upload(token, pdf, { fields = {}, filename = 'diploma.pdf', contentType = 'application/pdf', field = 'pdf' } = {}) {
  let req = request(app).post('/api/certificates').set(auth(token));
  const body = { studentName: 'Amina Test', studentEmail: 'amina@example.edu', program: 'Computer Science', degree: 'BSc', ...fields };
  for (const [k, v] of Object.entries(body)) req = req.field(k, v);
  return req.attach(field, pdf, { filename, contentType });
}

const confirm = (token, cert, txHash = TX) =>
  request(app).post(`/api/certificates/${cert.certificateId}/confirm`).set(auth(token)).send({ txHash });

// ── shared state ────────────────────────────────────────────────────────────
let adminToken;
let uniAToken;
let uniBToken;
let uniAId;
let uniBId;

describe('CertiChain API — security & lifecycle', () => {
  beforeAll(async () => {
    await connectDb();
    await Promise.all([User.deleteMany({}), University.deleteMany({}), Certificate.deleteMany({}), AuditLog.deleteMany({})]);

    chain.hasAdminRole.mockResolvedValue(true);
    chain.isIssuerAuthorized.mockResolvedValue(true);

    // admin account (created directly — there is no public registration endpoint)
    await User.create({ email: ADMIN_EMAIL, passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 4), role: 'admin' });
    adminToken = (await request(app).post('/api/auth/login').send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })).body.token;

    // university A
    const a = await request(app)
      .post('/api/admin/universities')
      .set(auth(adminToken))
      .send({ name: 'Test University A', ethAddress: ETH_A, email: UNI_A_EMAIL, password: UNI_PASSWORD });
    uniAId = a.body.university.id;
    chain.parseTransaction.mockResolvedValue(authReceipt(ETH_A));
    await request(app).post(`/api/admin/universities/${uniAId}/confirm-authorization`).set(auth(adminToken)).send({ txHash: TX });
    uniAToken = (await request(app).post('/api/auth/login').send({ email: UNI_A_EMAIL, password: UNI_PASSWORD })).body.token;

    // university B
    const b = await request(app)
      .post('/api/admin/universities')
      .set(auth(adminToken))
      .send({ name: 'Test University B', ethAddress: ETH_B, email: UNI_B_EMAIL, password: UNI_PASSWORD });
    uniBId = b.body.university.id;
    chain.parseTransaction.mockResolvedValue(authReceipt(ETH_B));
    await request(app).post(`/api/admin/universities/${uniBId}/confirm-authorization`).set(auth(adminToken)).send({ txHash: TX });
    uniBToken = (await request(app).post('/api/auth/login').send({ email: UNI_B_EMAIL, password: UNI_PASSWORD })).body.token;
  });

  beforeEach(() => {
    jest.resetAllMocks();
    chain.provider.getBlockNumber.mockResolvedValue(42);
    chain.getCertificateOnChain.mockResolvedValue({ exists: false, issuer: ZERO_ADDR, fingerprint: ZERO_HASH, issuedAt: 0, revokedAt: 0 });
    chain.verifyOnChain.mockResolvedValue(false);
    chain.isIssuerAuthorized.mockResolvedValue(true);
    chain.hasAdminRole.mockResolvedValue(true);
    chain.parseTransaction.mockRejectedValue(new ApiError(502, 'CHAIN_ERROR', 'Transaction not found on chain.'));
  });

  afterAll(async () => {
    const certs = await Certificate.find().select('+storedFile').lean();
    for (const c of certs) {
      if (c.storedFile) await fsp.unlink(c.storedFile).catch(() => {});
    }
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  // ── health / 404 ──────────────────────────────────────────────────────────
  describe('service basics', () => {
    it('GET /api/health reports the chain configuration', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.blockchain.contract).toBe(CONTRACT_ADDRESS);
      expect(res.body.blockchain.connected).toBe(true);
    });

    it('unknown routes return clean JSON without stack traces', async () => {
      const res = await request(app).get('/api/definitely-not-a-route');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
      expect(res.text).not.toContain('at Object');
    });
  });

  // ── SEC-01 / SEC-02 / SEC-13 ──────────────────────────────────────────────
  describe('access control and tokens', () => {
    it('SEC-01: protected routes reject missing / malformed / invalid tokens (401)', async () => {
      const noToken = await Promise.all([
        request(app).get('/api/admin/universities'),
        request(app).get('/api/certificates'),
        request(app).get('/api/auth/me'),
      ]);
      for (const r of noToken) expect(r.status).toBe(401);

      expect((await request(app).get('/api/admin/universities').set(auth('garbage.token.here'))).status).toBe(401);
      expect((await request(app).get('/api/certificates').set({ Authorization: 'Token abc' })).status).toBe(401);
    });

    it('SEC-02: roles are enforced server-side (403)', async () => {
      // university token on an admin route
      expect((await request(app).get('/api/admin/universities').set(auth(uniAToken))).status).toBe(403);
      // admin token on the university-only issuance surface
      expect((await upload(adminToken, makePdf())).status).toBe(403);
      // a correctly signed but unknown role gets nothing
      const studentToken = jwt.sign({ email: 's@example.edu', role: 'student' }, JWT_SECRET, {
        subject: 'x',
        expiresIn: '1h',
        algorithm: 'HS256',
      });
      expect((await request(app).get('/api/admin/universities').set(auth(studentToken))).status).toBe(403);
      expect((await upload(studentToken, makePdf())).status).toBe(403);
    });

    it('SEC-13: expired, tampered, wrong-signature and alg:none tokens are rejected (401)', async () => {
      const expired = jwt.sign({ email: ADMIN_EMAIL, role: 'admin' }, JWT_SECRET, { subject: 'x', expiresIn: '-10s' });
      const wrongSig = jwt.sign({ email: ADMIN_EMAIL, role: 'admin' }, 'attacker-secret', { subject: 'x', expiresIn: '1h' });

      const [h, , s] = uniAToken.split('.');
      const tamperedPayload = Buffer.from(JSON.stringify({ sub: 'x', email: ADMIN_EMAIL, role: 'admin' })).toString('base64url');
      const tampered = `${h}.${tamperedPayload}.${s}`; // valid signature, altered payload

      const noneHeader = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
      const noneToken = `${noneHeader}.${tamperedPayload}.`;

      for (const t of [expired, wrongSig, tampered, noneToken]) {
        const res = await request(app).get('/api/admin/universities').set(auth(t));
        expect(res.status).toBe(401);
      }
    });
  });

  // ── SEC-03 / SEC-16 ───────────────────────────────────────────────────────
  describe('account creation surface', () => {
    it('SEC-03/SEC-16: no public registration endpoint exists', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'evil@example.com', password: 'Password-123', role: 'admin' });
      expect(res.status).toBe(404);
    });

    it('SEC-03: a role field in a request body cannot escalate privileges', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: UNI_A_EMAIL, password: UNI_PASSWORD, role: 'admin' });
      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe('university');
    });
  });

  // ── SEC-09 / SEC-10 / SEC-11 ──────────────────────────────────────────────
  describe('upload validation', () => {
    it('SEC-09: non-PDF bytes named .pdf are rejected by magic-byte validation (400)', async () => {
      const exe = Buffer.concat([Buffer.from('MZ\u0090\u0000'), Buffer.alloc(400, 0x41)]);
      const res = await upload(uniAToken, exe, { filename: 'invoice.pdf' });
      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/not a valid PDF/i);
    });

    it('SEC-09: a wrong MIME type is rejected (400)', async () => {
      const res = await upload(uniAToken, makePdf(), { contentType: 'application/octet-stream' });
      expect(res.status).toBe(400);
    });

    it('SEC-10: empty file → 400 and oversized file → 413', async () => {
      expect((await upload(uniAToken, Buffer.alloc(0))).status).toBe(400);

      const big = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(1.5 * 1024 * 1024, 0x20), Buffer.from('\n%%EOF')]);
      expect((await upload(uniAToken, big)).status).toBe(413);
    });

    it('SEC-10: a file sent under the wrong field name is rejected (400)', async () => {
      const res = await upload(uniAToken, makePdf(), { field: 'file' });
      expect(res.status).toBe(400);
    });

    it('SEC-11: path traversal in the filename never reaches the filesystem', async () => {
      const res = await upload(uniAToken, makePdf(), { filename: '../../evil.pdf' });
      expect(res.status).toBe(201);

      const cert = await Certificate.findOne({ certificateId: res.body.certificateId }).select('+storedFile');
      expect(cert.storedFile).not.toContain('evil');
      expect(cert.storedFile).toContain('uploads');
      expect(path.basename(cert.storedFile)).toMatch(/^[0-9a-f-]{36}\.pdf$/);
      expect(cert.fileName).not.toContain('/');
      await expect(fsp.access(cert.storedFile)).resolves.toBeUndefined(); // stored under the random name
    });
  });

  // ── SEC-05 ────────────────────────────────────────────────────────────────
  describe('duplicate documents', () => {
    it('SEC-05: identical bytes cannot create a second certificate (409 PENDING_EXISTS, resume reference returned)', async () => {
      const pdf = makePdf();
      const first = await upload(uniAToken, pdf);
      expect(first.status).toBe(201);

      const second = await upload(uniAToken, pdf);
      expect(second.status).toBe(409);
      expect(second.body.error.code).toBe('PENDING_EXISTS');
      expect(second.body.existing.certificateId).toBe(first.body.certificateId);
    });

    it('SEC-05: another university re-uploading the same bytes is rejected without leaking the reference', async () => {
      const pdf = makePdf();
      await upload(uniAToken, pdf);
      const res = await upload(uniBToken, pdf);
      expect(res.status).toBe(409);
      expect(res.body.existing).toBeUndefined();
    });
  });

  // ── happy path ────────────────────────────────────────────────────────────
  describe('issuance lifecycle (happy path)', () => {
    it('upload → confirm on-chain → verify by ID & file → revoke → verify revoked', async () => {
      const pdf = makePdf();
      const up = await upload(uniAToken, pdf);
      expect(up.status).toBe(201);
      const { certificateId, sha256, certIdBytes32, fingerprintBytes32 } = up.body;
      expect(certIdBytes32).toMatch(/^0x[0-9a-f]{64}$/);
      expect(fingerprintBytes32).toBe('0x' + sha256);

      const cert = await Certificate.findOne({ certificateId });
      chain.parseTransaction.mockResolvedValueOnce(issuanceReceipt(cert, ETH_A));
      const conf = await confirm(uniAToken, cert);
      expect(conf.status).toBe(200);
      expect(conf.body.certificate.status).toBe('issued');
      expect(conf.body.qr.url).toBe(`http://localhost:5173/verify/${certificateId}`);
      expect(conf.body.qr.dataUrl).toMatch(/^data:image\/png;base64,/);

      // verify by ID — chain says active and the fingerprint matches
      chain.getCertificateOnChain.mockResolvedValueOnce(chainCert({ sha256 }));
      const byId = await request(app).get(`/api/verify/${certificateId}`);
      expect(byId.status).toBe(200);
      expect(byId.body.status).toBe('valid');
      expect(byId.body.university.name).toBe('Test University A');
      // VER-06: no student PII in public responses
      expect(byId.body).not.toHaveProperty('studentName');
      expect(byId.body).not.toHaveProperty('studentEmail');
      expect(JSON.stringify(byId.body)).not.toContain('amina@example.edu');

      // verify by file — original bytes
      chain.getCertificateOnChain.mockResolvedValueOnce(chainCert({ sha256 }));
      const byFile = await request(app)
        .post('/api/verify/file')
        .attach('pdf', pdf, { filename: 'diploma.pdf', contentType: 'application/pdf' });
      expect(byFile.status).toBe(200);
      expect(byFile.body.status).toBe('valid');

      // revoke
      chain.parseTransaction.mockResolvedValueOnce(revocationReceipt(cert, ETH_A));
      chain.getCertificateOnChain.mockResolvedValueOnce(chainCert({ sha256, revokedAt: nowSec() }));
      const rev = await request(app)
        .post(`/api/certificates/${certificateId}/revoke`)
        .set(auth(uniAToken))
        .send({ txHash: TX, reason: 'Issued in error' });
      expect(rev.status).toBe(200);
      expect(rev.body.certificate.status).toBe('revoked');

      // verify now reports revoked
      chain.getCertificateOnChain.mockResolvedValueOnce(chainCert({ sha256, revokedAt: nowSec() }));
      const after = await request(app).get(`/api/verify/${certificateId}`);
      expect(after.body.status).toBe('revoked');

      // SEC-07: repeated revocation is rejected
      const again = await request(app).post(`/api/certificates/${certificateId}/revoke`).set(auth(uniAToken)).send({ txHash: TX });
      expect(again.status).toBe(409);
    });
  });

  // ── SEC-06 ────────────────────────────────────────────────────────────────
  describe('ownership enforcement', () => {
    it('SEC-06: university B cannot revoke or read university A\u2019s certificate (404)', async () => {
      const up = await upload(uniAToken, makePdf());
      const cert = await Certificate.findOne({ certificateId: up.body.certificateId });
      chain.parseTransaction.mockResolvedValueOnce(issuanceReceipt(cert, ETH_A));
      await confirm(uniAToken, cert);

      const revoke = await request(app).post(`/api/certificates/${cert.certificateId}/revoke`).set(auth(uniBToken)).send({ txHash: TX });
      expect(revoke.status).toBe(404);

      const read = await request(app).get(`/api/certificates/${cert.certificateId}`).set(auth(uniBToken));
      expect(read.status).toBe(404);
    });
  });

  // ── SEC-17 ────────────────────────────────────────────────────────────────
  describe('confirm forgery — bogus transaction', () => {
    it('SEC-17: malformed / unknown / failed transactions never confirm a certificate', async () => {
      const up = await upload(uniAToken, makePdf());
      const id = up.body.certificateId;

      const malformed = await request(app).post(`/api/certificates/${id}/confirm`).set(auth(uniAToken)).send({ txHash: 'not-a-hash' });
      expect(malformed.status).toBe(400);

      const unknown = await request(app).post(`/api/certificates/${id}/confirm`).set(auth(uniAToken)).send({ txHash: TX });
      expect(unknown.status).toBe(502); // default mock: transaction not found on chain

      chain.parseTransaction.mockResolvedValueOnce(receipt({ from: ETH_A, events: [], status: 0 }));
      const failed = await request(app).post(`/api/certificates/${id}/confirm`).set(auth(uniAToken)).send({ txHash: TX });
      expect(failed.status).toBe(400);

      expect((await Certificate.findOne({ certificateId: id })).status).toBe('pending');
    });
  });

  // ── SEC-18 ────────────────────────────────────────────────────────────────
  describe('confirm forgery — mismatched on-chain data', () => {
    it('SEC-18: every mismatching field (id / fingerprint / issuer / sender / target) is rejected', async () => {
      const up = await upload(uniAToken, makePdf());
      const cert = await Certificate.findOne({ certificateId: up.body.certificateId });

      // (a) event belongs to a different certificate
      const other = await upload(uniAToken, makePdf());
      const otherCert = await Certificate.findOne({ certificateId: other.body.certificateId });
      chain.parseTransaction.mockResolvedValueOnce(issuanceReceipt(otherCert, ETH_A));
      expect((await confirm(uniAToken, cert)).status).toBe(400);

      // (b) fingerprint mismatch
      const badFp = issuanceReceipt(cert, ETH_A);
      badFp.events[0].args.fingerprint = '0x' + '11'.repeat(32);
      chain.parseTransaction.mockResolvedValueOnce(badFp);
      expect((await confirm(uniAToken, cert)).status).toBe(400);

      // (c) issuer mismatch
      const badIssuer = issuanceReceipt(cert, ETH_A);
      badIssuer.events[0].args.issuer = ETH_B.toLowerCase();
      chain.parseTransaction.mockResolvedValueOnce(badIssuer);
      expect((await confirm(uniAToken, cert)).status).toBe(400);

      // (d) transaction sent by a different wallet
      const badFrom = issuanceReceipt(cert, ETH_A);
      badFrom.from = ETH_B.toLowerCase();
      chain.parseTransaction.mockResolvedValueOnce(badFrom);
      expect((await confirm(uniAToken, cert)).status).toBe(403);

      // (e) transaction sent to a different contract
      const badTo = issuanceReceipt(cert, ETH_A);
      badTo.to = '0x000000000000000000000000000000000000dead';
      chain.parseTransaction.mockResolvedValueOnce(badTo);
      expect((await confirm(uniAToken, cert)).status).toBe(400);

      // none of the forgeries changed the record
      expect((await Certificate.findOne({ certificateId: cert.certificateId })).status).toBe('pending');

      // sanity: the genuine receipt succeeds
      chain.parseTransaction.mockResolvedValueOnce(issuanceReceipt(cert, ETH_A));
      expect((await confirm(uniAToken, cert)).status).toBe(200);
    });
  });

  // ── SEC-19 ────────────────────────────────────────────────────────────────
  describe('cross-university confirmation', () => {
    it('SEC-19: university B cannot confirm university A\u2019s pending certificate (404)', async () => {
      const up = await upload(uniAToken, makePdf());
      const res = await request(app).post(`/api/certificates/${up.body.certificateId}/confirm`).set(auth(uniBToken)).send({ txHash: TX });
      expect(res.status).toBe(404);
    });
  });

  // ── SEC-04 / SEC-14 ───────────────────────────────────────────────────────
  describe('public verification', () => {
    it('SEC-04: a one-byte modification of an issued PDF is never VALID', async () => {
      const pdf = makePdf();
      const up = await upload(uniAToken, pdf);
      const cert = await Certificate.findOne({ certificateId: up.body.certificateId });
      chain.parseTransaction.mockResolvedValueOnce(issuanceReceipt(cert, ETH_A));
      await confirm(uniAToken, cert);

      chain.getCertificateOnChain.mockResolvedValueOnce(chainCert({ sha256: cert.sha256 }));
      const original = await request(app).post('/api/verify/file').attach('pdf', pdf, { filename: 'd.pdf', contentType: 'application/pdf' });
      expect(original.body.status).toBe('valid');

      // insert one byte in the middle — header and %%EOF trailer stay intact
      const tampered = Buffer.concat([pdf.subarray(0, 20), Buffer.from('X'), pdf.subarray(20)]);
      const res = await request(app).post('/api/verify/file').attach('pdf', tampered, { filename: 'd.pdf', contentType: 'application/pdf' });
      expect(res.status).toBe(404);
      expect(res.body.status).toBe('not_found');
      expect(res.body.sha256).not.toBe(cert.sha256);
    });

    it('SEC-14: unknown IDs and malformed input disclose nothing', async () => {
      const res = await request(app).get(`/api/verify/${crypto.randomUUID()}`);
      expect(res.status).toBe(404);
      expect(res.body.status).toBe('not_found');
      expect(res.text).not.toMatch(/studentName|studentEmail|at Object/);

      expect((await request(app).get('/api/verify/not-a-uuid')).status).toBe(400);

      const badJson = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{bad json');
      expect(badJson.status).toBe(400);
      expect(badJson.body.error.code).toBe('BAD_JSON');
    });
  });

  // ── SEC-15 ────────────────────────────────────────────────────────────────
  describe('audit trail', () => {
    it('SEC-15: successful and failed actions are recorded with actor, IP and result', async () => {
      await request(app).post('/api/auth/login').send({ email: 'nobody@test.local', password: 'Wrong-Password-1' });
      const up = await upload(uniAToken, makePdf());
      expect(up.status).toBe(201);

      await sleep(500); // audit writes are fire-and-forget

      const failed = await AuditLog.findOne({ action: 'auth.login', result: 'failure' });
      expect(failed).toBeTruthy();
      expect(failed.ip).toBeTruthy();

      const recorded = await AuditLog.findOne({ action: 'certificate.upload', result: 'success', target: up.body.certificateId });
      expect(recorded).toBeTruthy();
      expect(recorded.actorEmail).toBe(UNI_A_EMAIL);
    });
  });
});
