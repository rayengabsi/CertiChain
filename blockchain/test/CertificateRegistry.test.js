/**
 * CertificateRegistry test suite — the professor's criterion B evidence.
 * Covers every scenario required by the brief (CT-01 … CT-15) plus documented semantics.
 *
 * Run: npm test   (inside blockchain/)
 */
const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('CertificateRegistry', function () {
  let registry;
  let admin, university1, university2, stranger;

  const ADMIN_ROLE = ethers.ZeroHash; // AccessControl.DEFAULT_ADMIN_ROLE
  const ISSUER_ROLE = ethers.id('ISSUER_ROLE'); // keccak256("ISSUER_ROLE")

  // Simulated SHA-256 fingerprints (32 bytes, never zero)
  const FP_A = '0x' + '11'.repeat(32);
  const FP_B = '0x' + '22'.repeat(32);
  const CERT_1 = ethers.encodeBytes32String('certificate-0001');
  const CERT_2 = ethers.encodeBytes32String('certificate-0002');
  const CERT_3 = ethers.encodeBytes32String('certificate-0003');
  const CERT_4 = ethers.encodeBytes32String('certificate-0004');
  const UNKNOWN = ethers.encodeBytes32String('unknown-cert');

  before(async function () {
    [admin, university1, university2, stranger] = await ethers.getSigners();
    const Registry = await ethers.getContractFactory('CertificateRegistry', admin);
    registry = await Registry.deploy();
    await registry.waitForDeployment();
  });

  /** Parse the contract's own events out of a transaction receipt. */
  async function eventsOf(txPromise) {
    const tx = await txPromise;
    const rc = await tx.wait();
    return rc.logs
      .map((log) => {
        try {
          return registry.interface.parseLog({ topics: [...log.topics], data: log.data });
        } catch {
          return null; // not our contract's event
        }
      })
      .filter(Boolean)
      .map((e) => ({ name: e.name, args: e.args }));
  }

  // ── CT-09: deployment & admin role management ─────────────────────────────
  describe('deployment and roles', function () {
    it('grants DEFAULT_ADMIN_ROLE to the deployer', async function () {
      expect(await registry.hasRole(ADMIN_ROLE, admin.address)).to.equal(true);
    });

    it('grants no ISSUER_ROLE by default', async function () {
      expect(await registry.hasRole(ISSUER_ROLE, university1.address)).to.equal(false);
      expect(await registry.isIssuerAuthorized(university1.address)).to.equal(false);
    });
  });

  // ── CT-09: university authorization / deauthorization ──────────────────────
  describe('university authorization (admin)', function () {
    it('CT-09: admin authorizes a university (role granted + event)', async function () {
      const events = await eventsOf(registry.connect(admin).authorizeIssuer(university1.address));
      const ev = events.find((e) => e.name === 'IssuerAuthorized');
      expect(ev, 'IssuerAuthorized event must be emitted').to.not.be.undefined;
      expect(ev.args.issuer).to.equal(university1.address);
      expect(ev.args.authorizedBy).to.equal(admin.address);
      expect(await registry.hasRole(ISSUER_ROLE, university1.address)).to.equal(true);
      expect(await registry.isIssuerAuthorized(university1.address)).to.equal(true);
    });

    it('CT-09: rejects authorization attempts by a non-admin', async function () {
      await expect(registry.connect(stranger).authorizeIssuer(university2.address))
        .to.be.revertedWithCustomError(registry, 'AccessControlUnauthorizedAccount')
        .withArgs(stranger.address, ADMIN_ROLE);
    });

    it('rejects the zero address', async function () {
      await expect(registry.connect(admin).authorizeIssuer(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(registry, 'InvalidIssuerAddress');
      await expect(registry.connect(admin).deauthorizeIssuer(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(registry, 'InvalidIssuerAddress');
    });

    it('CT-09: admin deauthorizes a university (role removed + event)', async function () {
      await (await registry.connect(admin).authorizeIssuer(university2.address)).wait();
      const events = await eventsOf(registry.connect(admin).deauthorizeIssuer(university2.address));
      const ev = events.find((e) => e.name === 'IssuerDeauthorized');
      expect(ev, 'IssuerDeauthorized event must be emitted').to.not.be.undefined;
      expect(ev.args.issuer).to.equal(university2.address);
      expect(await registry.hasRole(ISSUER_ROLE, university2.address)).to.equal(false);
    });
  });

  // ── CT-01/02/03/11: issuance ──────────────────────────────────────────────
  describe('certificate issuance', function () {
    before(async function () {
      await (await registry.connect(admin).authorizeIssuer(university1.address)).wait();
      await (await registry.connect(admin).authorizeIssuer(university2.address)).wait();
    });

    it('CT-01: authorized university issues a certificate (event + storage)', async function () {
      const events = await eventsOf(registry.connect(university1).issue(CERT_1, FP_A));
      const ev = events.find((e) => e.name === 'CertificateIssued');
      expect(ev, 'CertificateIssued event must be emitted').to.not.be.undefined;
      expect(ev.args.certificateId).to.equal(CERT_1);
      expect(ev.args.issuer).to.equal(university1.address);
      expect(ev.args.fingerprint).to.equal(FP_A);

      const cert = await registry.getCertificate(CERT_1);
      expect(cert.exists).to.equal(true);
      expect(cert.issuer).to.equal(university1.address);
      expect(cert.fingerprint).to.equal(FP_A);
      expect(Number(cert.issuedAt)).to.be.greaterThan(0);
      expect(cert.revokedAt).to.equal(0n);
    });

    it('CT-02: rejects issuance without ISSUER_ROLE', async function () {
      await expect(registry.connect(stranger).issue(CERT_2, FP_B))
        .to.be.revertedWithCustomError(registry, 'AccessControlUnauthorizedAccount')
        .withArgs(stranger.address, ISSUER_ROLE);
    });

    it('CT-03: rejects duplicate certificate ID', async function () {
      await expect(registry.connect(university1).issue(CERT_1, FP_B))
        .to.be.revertedWithCustomError(registry, 'CertificateAlreadyExists')
        .withArgs(CERT_1);
    });

    it('CT-11: rejects zero fingerprint and zero certificate ID', async function () {
      await expect(registry.connect(university1).issue(CERT_2, ethers.ZeroHash))
        .to.be.revertedWithCustomError(registry, 'InvalidFingerprint');
      await expect(registry.connect(university1).issue(ethers.ZeroHash, FP_B))
        .to.be.revertedWithCustomError(registry, 'InvalidCertificateId');
    });

    it('CT-09: deauthorized university can no longer issue', async function () {
      await (await registry.connect(university2).issue(CERT_2, FP_B)).wait();
      await (await registry.connect(admin).deauthorizeIssuer(university2.address)).wait();
      await expect(registry.connect(university2).issue(CERT_3, FP_B))
        .to.be.revertedWithCustomError(registry, 'AccessControlUnauthorizedAccount')
        .withArgs(university2.address, ISSUER_ROLE);
    });
  });

  // ── CT-04/05/12: verification ─────────────────────────────────────────────
  describe('verification', function () {
    it('CT-04: true for the correct fingerprint of an active certificate', async function () {
      expect(await registry.verify(CERT_1, FP_A)).to.equal(true);
    });

    it('CT-05: false for an incorrect fingerprint (modified document)', async function () {
      expect(await registry.verify(CERT_1, FP_B)).to.equal(false);
    });

    it('CT-12: false for a nonexistent certificate ID', async function () {
      expect(await registry.verify(UNKNOWN, FP_A)).to.equal(false);
    });

    it('getCertificate reports exists=false for a nonexistent ID (no data leak)', async function () {
      const cert = await registry.getCertificate(UNKNOWN);
      expect(cert.exists).to.equal(false);
      expect(cert.issuer).to.equal(ethers.ZeroAddress);
    });
  });

  // ── CT-06/07/08 + documented semantics: revocation ────────────────────────
  describe('revocation and issuer ownership', function () {
    before(async function () {
      await (await registry.connect(university1).issue(CERT_3, FP_A)).wait();
    });

    it('CT-07: a different university cannot revoke (issuer ownership enforced)', async function () {
      await expect(registry.connect(university2).revoke(CERT_1))
        .to.be.revertedWithCustomError(registry, 'NotCertificateIssuer')
        .withArgs(CERT_1);
    });

    it('CT-07: a stranger cannot revoke', async function () {
      await expect(registry.connect(stranger).revoke(CERT_3))
        .to.be.revertedWithCustomError(registry, 'NotCertificateIssuer')
        .withArgs(CERT_3);
    });

    it('CT-14: revoking a nonexistent certificate fails', async function () {
      await expect(registry.connect(university1).revoke(UNKNOWN))
        .to.be.revertedWithCustomError(registry, 'CertificateNotFound');
    });

    it('CT-06: the issuing university revokes successfully (event + state + verify flips)', async function () {
      const events = await eventsOf(registry.connect(university1).revoke(CERT_1));
      const ev = events.find((e) => e.name === 'CertificateRevoked');
      expect(ev, 'CertificateRevoked event must be emitted').to.not.be.undefined;
      expect(ev.args.certificateId).to.equal(CERT_1);
      expect(ev.args.revokedBy).to.equal(university1.address);

      const cert = await registry.getCertificate(CERT_1);
      expect(Number(cert.revokedAt)).to.be.greaterThan(0);
      expect(await registry.verify(CERT_1, FP_A)).to.equal(false); // revoked ⇒ no longer valid
    });

    it('CT-08: repeated revocation is rejected', async function () {
      await expect(registry.connect(university1).revoke(CERT_1))
        .to.be.revertedWithCustomError(registry, 'CertificateAlreadyRevoked')
        .withArgs(CERT_1);
    });

    it('admin can emergency-revoke any certificate (documented governance power)', async function () {
      const events = await eventsOf(registry.connect(admin).revoke(CERT_3));
      const ev = events.find((e) => e.name === 'CertificateRevoked');
      expect(ev.args.revokedBy).to.equal(admin.address);
      expect(await registry.verify(CERT_3, FP_A)).to.equal(false);
    });

    it('deauthorized university can still revoke its OWN past certificate (documented semantic)', async function () {
      // university2 was deauthorized in the issuance block but issued CERT_2 before that
      const events = await eventsOf(registry.connect(university2).revoke(CERT_2));
      const ev = events.find((e) => e.name === 'CertificateRevoked');
      expect(ev.args.revokedBy).to.equal(university2.address);
    });

    it('CT-13: full lifecycle leaves a complete on-chain trail (issue → revoke → query)', async function () {
      const issued = await eventsOf(registry.connect(university1).issue(CERT_4, FP_B));
      expect(issued.find((e) => e.name === 'CertificateIssued')).to.not.be.undefined;

      const revoked = await eventsOf(registry.connect(university1).revoke(CERT_4));
      expect(revoked.find((e) => e.name === 'CertificateRevoked')).to.not.be.undefined;

      const cert = await registry.getCertificate(CERT_4);
      expect(cert.exists).to.equal(true);
      expect(Number(cert.revokedAt)).to.be.greaterThan(0);
      expect(await registry.verify(CERT_4, FP_B)).to.equal(false);
    });
  });
});
