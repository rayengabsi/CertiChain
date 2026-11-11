const crypto = require('node:crypto');
const Certificate = require('../models/Certificate');
const University = require('../models/University');
const ApiError = require('../utils/ApiError');
const { CERTIFICATE_STATUS } = require('../config/constants');
const { sha256Hex } = require('../services/hash.service');
const { storeFile } = require('../services/storage.service');
const { validatePdfBuffer } = require('../utils/pdfValidator');
const { verificationQrDataUrl } = require('../services/qr.service');
const { audit } = require('../services/audit.service');
const chain = require('../services/blockchain.service');

const CONTRACT = () => require('../config/env').CONTRACT_ADDRESS.toLowerCase();

/** Load the caller's university (must exist and be authorized on-chain to issue). */
async function requireAuthorizedUniversity(req) {
  if (!req.user.universityId) throw ApiError.forbidden('This account is not linked to a university.');
  const university = await University.findById(req.user.universityId);
  if (!university) throw ApiError.forbidden('University record not found.');
  if (!university.authorized) {
    throw ApiError.forbidden('This university is not authorized to issue certificates. Ask the platform admin to authorize your wallet on-chain.');
  }
  return university;
}

/**
 * POST /api/certificates  (multipart, field "pdf")
 * 1. validate the PDF bytes (magic bytes + trailer) in memory,
 * 2. compute SHA-256 SERVER-SIDE over those exact bytes,
 * 3. enforce one-PDF-one-certificate (unique hash),
 * 4. store the bytes under a random filename, create a PENDING record.
 * The blockchain write is NOT done here — the university signs it with MetaMask,
 * then calls POST /:id/confirm.
 */
async function uploadCertificate(req, res, next) {
  try {
    const university = await requireAuthorizedUniversity(req);

    if (!req.file) throw ApiError.badRequest('No PDF file uploaded (expected multipart field "pdf").');
    validatePdfBuffer(req.file.buffer, req.file.originalname);

    const sha256 = sha256Hex(req.file.buffer);

    const existing = await Certificate.findOne({ sha256 });
    if (existing) {
      const mine = String(existing.universityId) === String(university._id);
      audit({
        actorEmail: req.user.email,
        actorRole: req.user.role,
        action: 'certificate.upload',
        target: sha256,
        ip: req.ip,
        result: 'failure',
        details: 'duplicate document',
      });
      const code = existing.status === CERTIFICATE_STATUS.PENDING ? 'PENDING_EXISTS' : 'DUPLICATE_DOCUMENT';
      return res.status(409).json({
        error: {
          code,
          message:
            code === 'PENDING_EXISTS'
              ? 'This exact document already has a pending issuance for your university. Confirm it with MetaMask instead of re-uploading.'
              : 'This exact document is already registered on CertiChain (one PDF = one certificate).',
        },
        // Only reveal the existing reference to its owner (resume flow).
        existing: mine ? { certificateId: existing.certificateId, status: existing.status } : undefined,
      });
    }

    const certificateId = crypto.randomUUID(); // UUID v4 — the public, non-identifying reference
    const { filePath } = await storeFile(req.file.buffer);

    const certificate = await Certificate.create({
      certificateId,
      sha256,
      universityId: university._id,
      studentName: String(req.body.studentName).trim(),
      studentEmail: String(req.body.studentEmail).toLowerCase().trim(),
      program: String(req.body.program).trim(),
      degree: String(req.body.degree).trim(),
      fileName: String(req.file.originalname).replace(/[^\w.\-() ]/g, '_').slice(0, 200),
      storedFile: filePath,
      sizeBytes: req.file.size,
      status: CERTIFICATE_STATUS.PENDING,
    });

    audit({
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'certificate.upload',
      target: certificateId,
      ip: req.ip,
      result: 'success',
      details: `sha256=${sha256} bytes=${req.file.size}`,
    });

    return res.status(201).json({
      certificateId,
      certIdBytes32: chain.certIdToBytes32(certificateId), // ready for contract.issue(...)
      sha256,
      fingerprintBytes32: chain.sha256ToBytes32(sha256),
      status: certificate.status,
      nextStep: 'Sign contract.issue(certIdBytes32, fingerprintBytes32) with MetaMask, then POST /api/certificates/:id/confirm with the transaction hash.',
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/certificates/:id/confirm  { txHash }
 * NEVER trusts the client: the backend reads the receipt from the chain and requires
 *  - status 1, to == contract,
 *  - a CertificateIssued event whose certificateId, fingerprint AND issuer all match
 *    this pending record and the university's registered wallet,
 *  - and tx.from == the university's wallet (the university signed it itself).
 */
async function confirmIssuance(req, res, next) {
  try {
    const certificate = await Certificate.findOne({
      certificateId: req.params.id,
      universityId: req.user.universityId, // SEC-19: cannot confirm another university's record (404)
    });
    if (!certificate) throw ApiError.notFound('Certificate not found.');

    if (certificate.status === CERTIFICATE_STATUS.ISSUED) throw ApiError.conflict('This certificate is already issued.');
    if (certificate.status === CERTIFICATE_STATUS.REVOKED) throw ApiError.conflict('This certificate has been revoked.');

    const university = await University.findById(certificate.universityId);
    if (!university) throw ApiError.forbidden('University record not found.');

    const receipt = await chain.parseTransaction(req.body.txHash);

    if (receipt.status !== 1) throw ApiError.badRequest('Transaction failed on-chain.');
    if (receipt.to !== CONTRACT()) throw ApiError.badRequest('Transaction was not sent to the CertiChain contract.');
    if (receipt.from !== university.ethAddress.toLowerCase()) {
      throw ApiError.forbidden('The transaction was not signed by this university\u2019s registered wallet.');
    }

    const expectedId = chain.certIdToBytes32(certificate.certificateId);
    const expectedFp = chain.sha256ToBytes32(certificate.sha256);
    const event = receipt.events.find((e) => e.name === 'CertificateIssued' && e.args.certificateId === expectedId);
    if (!event) throw ApiError.badRequest('No CertificateIssued event for this certificate was found in the transaction.');
    if (event.args.fingerprint !== expectedFp) throw ApiError.badRequest('The on-chain fingerprint does not match this document.');
    if (event.args.issuer !== university.ethAddress.toLowerCase()) throw ApiError.badRequest('The on-chain issuer does not match this university.');

    certificate.status = CERTIFICATE_STATUS.ISSUED;
    certificate.issueTxHash = receipt.txHash;
    certificate.issueBlock = receipt.blockNumber;
    certificate.issuedAt = new Date(Number(event.args.timestamp) * 1000);
    await certificate.save();

    audit({
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'certificate.confirmIssuance',
      target: certificate.certificateId,
      ip: req.ip,
      result: 'success',
      details: `tx=${receipt.txHash} block=${receipt.blockNumber}`,
    });

    const qr = await verificationQrDataUrl(certificate.certificateId);
    return res.json({
      certificate: {
        certificateId: certificate.certificateId,
        status: certificate.status,
        issuedAt: certificate.issuedAt,
        issueTxHash: certificate.issueTxHash,
        issueBlock: certificate.issueBlock,
      },
      qr,
    });
  } catch (err) {
    return next(err);
  }
}

/** GET /api/certificates — the caller's university's certificates. */
async function listCertificates(req, res, next) {
  try {
    const certificates = await Certificate.find({ universityId: req.user.universityId })
      .select('-storedFile')
      .sort({ createdAt: -1 })
      .limit(300)
      .lean();
    return res.json({ certificates });
  } catch (err) {
    return next(err);
  }
}

/** GET /api/certificates/:id — detail + QR (university dashboard only; may include PII). */
async function getCertificate(req, res, next) {
  try {
    const certificate = await Certificate.findOne({
      certificateId: req.params.id,
      universityId: req.user.universityId,
    }).select('-storedFile');
    if (!certificate) throw ApiError.notFound('Certificate not found.');

    const qr = await verificationQrDataUrl(certificate.certificateId);
    return res.json({
      certificate: {
        certificateId: certificate.certificateId,
        sha256: certificate.sha256,
        certIdBytes32: chain.certIdToBytes32(certificate.certificateId),
        fingerprintBytes32: chain.sha256ToBytes32(certificate.sha256),
        studentName: certificate.studentName,
        studentEmail: certificate.studentEmail,
        program: certificate.program,
        degree: certificate.degree,
        fileName: certificate.fileName,
        status: certificate.status,
        issuedAt: certificate.issuedAt,
        issueTxHash: certificate.issueTxHash,
        issueBlock: certificate.issueBlock,
        revokedAt: certificate.revokedAt,
        revokeTxHash: certificate.revokeTxHash,
        revokeReason: certificate.revokeReason,
        createdAt: certificate.createdAt,
      },
      qr,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/certificates/:id/revoke  { txHash, reason? }
 * Verifies the CertificateRevoked event on-chain and the live revoked state.
 */
async function revokeCertificate(req, res, next) {
  try {
    const certificate = await Certificate.findOne({
      certificateId: req.params.id,
      universityId: req.user.universityId,
    });
    if (!certificate) throw ApiError.notFound('Certificate not found.');

    if (certificate.status === CERTIFICATE_STATUS.PENDING) {
      throw ApiError.badRequest('This certificate has not been issued on-chain yet, so it cannot be revoked.');
    }
    if (certificate.status === CERTIFICATE_STATUS.REVOKED) throw ApiError.conflict('This certificate is already revoked.');

    const university = await University.findById(certificate.universityId);
    if (!university) throw ApiError.forbidden('University record not found.');

    const receipt = await chain.parseTransaction(req.body.txHash);

    if (receipt.status !== 1) throw ApiError.badRequest('Transaction failed on-chain.');
    if (receipt.to !== CONTRACT()) throw ApiError.badRequest('Transaction was not sent to the CertiChain contract.');

    const expectedId = chain.certIdToBytes32(certificate.certificateId);
    const event = receipt.events.find((e) => e.name === 'CertificateRevoked' && e.args.certificateId === expectedId);
    if (!event) throw ApiError.badRequest('No CertificateRevoked event for this certificate was found in the transaction.');

    // The revoker must be the university's own wallet, or an on-chain admin (emergency revocation).
    const isIssuerWallet = event.args.revokedBy === university.ethAddress.toLowerCase() && receipt.from === university.ethAddress.toLowerCase();
    const isAdminWallet = await chain.hasAdminRole(receipt.from);
    if (!isIssuerWallet && !isAdminWallet) {
      throw ApiError.forbidden('The transaction was not signed by this university\u2019s wallet or an on-chain admin.');
    }

    // Live chain state must confirm the revocation (chain is the source of truth).
    const onChain = await chain.getCertificateOnChain(certificate.certificateId);
    if (!onChain.exists || onChain.revokedAt === 0) throw ApiError.badRequest('On-chain state does not show this certificate as revoked.');

    certificate.status = CERTIFICATE_STATUS.REVOKED;
    certificate.revokedAt = new Date(onChain.revokedAt * 1000);
    certificate.revokeTxHash = receipt.txHash;
    certificate.revokeReason = req.body.reason ? String(req.body.reason).trim().slice(0, 500) : null;
    await certificate.save();

    audit({
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'certificate.revoke',
      target: certificate.certificateId,
      ip: req.ip,
      result: 'success',
      details: `tx=${receipt.txHash} reason=${certificate.revokeReason || '-'}`,
    });

    return res.json({
      certificate: {
        certificateId: certificate.certificateId,
        status: certificate.status,
        revokedAt: certificate.revokedAt,
        revokeTxHash: certificate.revokeTxHash,
        revokeReason: certificate.revokeReason,
      },
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  uploadCertificate,
  confirmIssuance,
  listCertificates,
  getCertificate,
  revokeCertificate,
};
