const Certificate = require('../models/Certificate');
const University = require('../models/University');
const ApiError = require('../utils/ApiError');
const { sha256Hex } = require('../services/hash.service');
const { validatePdfBuffer } = require('../utils/pdfValidator');
const { audit } = require('../services/audit.service');
const chain = require('../services/blockchain.service');

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Build the PUBLIC verification payload.
 * Invariant VER-06: student name and email are NEVER included here.
 * Invariant: the blockchain is the source of truth — if the DB and the chain
 * disagree, the chain decides the status.
 */
async function buildPublicResult(certificate) {
  const onChain = await chain.getCertificateOnChain(certificate.certificateId);

  if (!onChain.exists) {
    // Record exists off-chain but no anchor yet → issuance not completed on-chain.
    return { status: 'pending', message: 'This certificate record exists but has not been anchored on-chain yet.' };
  }

  const fingerprintMatches = onChain.fingerprint === chain.sha256ToBytes32(certificate.sha256);
  let status;
  if (onChain.revokedAt > 0) status = 'revoked';
  else if (!fingerprintMatches) status = 'invalid_or_modified';
  else status = 'valid';

  const university = certificate.universityId ? await University.findById(certificate.universityId).lean() : null;

  return {
    status,
    certificateId: certificate.certificateId,
    university: university ? { name: university.name, wallet: university.ethAddress } : null,
    program: certificate.program,
    degree: certificate.degree,
    issuedAt: onChain.issuedAt ? new Date(onChain.issuedAt * 1000) : certificate.issuedAt,
    revokedAt: onChain.revokedAt ? new Date(onChain.revokedAt * 1000) : null,
    issueTxHash: certificate.issueTxHash,
    revokeTxHash: certificate.revokeTxHash,
    onChain: {
      issuer: onChain.issuer,
      fingerprint: onChain.fingerprint,
      fingerprintMatchesRecord: fingerprintMatches,
    },
  };
}

/** GET /api/verify/:certificateId — public verification by certificate ID. */
async function verifyById(req, res, next) {
  try {
    const { certificateId } = req.params;
    if (!UUID_V4.test(certificateId)) throw ApiError.badRequest('Malformed certificate ID (expected UUID v4).');

    const certificate = await Certificate.findOne({ certificateId }).select('-storedFile').lean();
    if (!certificate) {
      audit({ action: 'verify.byId', target: certificateId, ip: req.ip, result: 'failure', details: 'not found' });
      return res.status(404).json({ status: 'not_found', message: 'No certificate with this ID is registered on CertiChain.' });
    }

    const result = await buildPublicResult(certificate);
    audit({ action: 'verify.byId', target: certificateId, ip: req.ip, result: 'success', details: `status=${result.status}` });
    return res.json(result);
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/verify/file  (multipart, field "pdf")
 * Recomputes SHA-256 of the uploaded bytes and looks for an anchor.
 * Note: because SHA-256 has the avalanche property, ANY modification makes the
 * digest differ from every registered document — such a file resolves to
 * "not_found" (never registered OR modified), which is the tamper-evidence.
 */
async function verifyByFile(req, res, next) {
  try {
    if (!req.file) throw ApiError.badRequest('No PDF file uploaded (expected multipart field "pdf").');
    validatePdfBuffer(req.file.buffer, req.file.originalname);

    const sha256 = sha256Hex(req.file.buffer);
    const certificate = await Certificate.findOne({ sha256 }).select('-storedFile').lean();

    if (!certificate) {
      audit({ action: 'verify.byFile', target: sha256, ip: req.ip, result: 'failure', details: 'no matching fingerprint' });
      return res.status(404).json({
        status: 'not_found',
        sha256,
        message:
          'No registered certificate matches this exact document. It was either never issued through CertiChain or it has been modified after issuance.',
      });
    }

    const result = await buildPublicResult(certificate);
    audit({ action: 'verify.byFile', target: sha256, ip: req.ip, result: 'success', details: `status=${result.status}` });
    return res.json({ ...result, sha256 });
  } catch (err) {
    return next(err);
  }
}

module.exports = { verifyById, verifyByFile };
