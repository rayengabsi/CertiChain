const bcrypt = require('bcryptjs');
const University = require('../models/University');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const ApiError = require('../utils/ApiError');
const { BCRYPT_ROUNDS } = require('../config/env');
const { ROLES } = require('../config/constants');
const { audit } = require('../services/audit.service');
const chain = require('../services/blockchain.service');

const CONTRACT = () => require('../config/env').CONTRACT_ADDRESS.toLowerCase();

/** GET /api/admin/universities — all universities + their account email. */
async function listUniversities(req, res, next) {
  try {
    const universities = await University.find().sort({ createdAt: -1 }).lean();
    const users = await User.find({ role: ROLES.UNIVERSITY }).select('email universityId fullName').lean();
    const emailByUniversity = new Map(users.map((u) => [String(u.universityId), u.email]));

    return res.json({
      universities: universities.map((u) => ({
        id: String(u._id),
        name: u.name,
        ethAddress: u.ethAddress,
        authorized: u.authorized,
        authorizedAt: u.authorizedAt,
        deauthorizedAt: u.deauthorizedAt,
        accountEmail: emailByUniversity.get(String(u._id)) || null,
        createdAt: u.createdAt,
      })),
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/admin/universities
 * Creates the university record AND its login account in one step.
 * The on-chain authorization is a SEPARATE, MetaMask-signed step (confirm-authorization).
 */
async function createUniversity(req, res, next) {
  try {
    const { name, ethAddress, email, password, fullName } = req.body;
    const wallet = String(ethAddress).toLowerCase().trim();

    if (await University.findOne({ ethAddress: wallet })) {
      throw ApiError.conflict('A university with this wallet address already exists.');
    }
    if (await University.findOne({ name: String(name).trim() })) {
      throw ApiError.conflict('A university with this name already exists.');
    }
    if (await User.findOne({ email: String(email).toLowerCase().trim() })) {
      throw ApiError.conflict('An account with this email already exists.');
    }

    const university = await University.create({
      name: String(name).trim(),
      ethAddress: wallet,
      authorized: false, // becomes true only after the on-chain role change is confirmed
      createdBy: req.user.id,
    });

    const user = await User.create({
      email: String(email).toLowerCase().trim(),
      passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS),
      role: ROLES.UNIVERSITY,
      universityId: university._id,
      fullName: fullName ? String(fullName).trim() : null,
    });

    audit({
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'admin.createUniversity',
      target: `${university.name} (${wallet})`,
      ip: req.ip,
      result: 'success',
    });

    // The password is deliberately NOT echoed back; the admin shares it out-of-band.
    return res.status(201).json({
      university: {
        id: String(university._id),
        name: university.name,
        ethAddress: university.ethAddress,
        authorized: university.authorized,
      },
      account: { email: user.email, role: user.role },
      nextStep: 'Authorize this wallet on-chain from the admin MetaMask wallet, then POST /confirm-authorization with the transaction hash.',
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Shared logic for confirm-authorization / confirm-deauthorization.
 * NEVER trusts the client: reads the receipt from the chain, requires the
 * expected event with matching args, the caller's tx to come from an on-chain
 * admin wallet, and the LIVE role state to agree.
 */
async function confirmRoleChange(req, res, next, { deauthorize }) {
  try {
    const university = await University.findById(req.params.id);
    if (!university) throw ApiError.notFound('University not found.');

    const { txHash } = req.body;
    const receipt = await chain.parseTransaction(txHash);

    if (receipt.status !== 1) throw ApiError.badRequest('Transaction failed on-chain.');
    if (receipt.to !== CONTRACT()) throw ApiError.badRequest('Transaction was not sent to the CertiChain contract.');

    const expectedEvent = deauthorize ? 'IssuerDeauthorized' : 'IssuerAuthorized';
    const event = receipt.events.find(
      (e) => e.name === expectedEvent && e.args.issuer === university.ethAddress.toLowerCase()
    );
    if (!event) {
      throw ApiError.badRequest(`No ${expectedEvent} event for this university was found in the transaction.`);
    }

    // The signer must hold DEFAULT_ADMIN_ROLE on-chain (any admin wallet is acceptable).
    if (!(await chain.hasAdminRole(receipt.from))) {
      throw ApiError.forbidden('The transaction was not signed by an on-chain admin wallet.');
    }

    // Live on-chain state must agree with the event (belt and braces).
    const authorizedNow = await chain.isIssuerAuthorized(university.ethAddress);
    if (deauthorize && authorizedNow) throw ApiError.badRequest('On-chain state still shows this issuer as authorized.');
    if (!deauthorize && !authorizedNow) throw ApiError.badRequest('On-chain state does not show this issuer as authorized.');

    const ts = new Date(Number(event.args.timestamp) * 1000);
    university.authorized = !deauthorize;
    if (deauthorize) {
      university.deauthorizedAt = ts;
    } else {
      university.authorizedAt = ts;
      university.deauthorizedAt = null;
    }
    await university.save();

    audit({
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: deauthorize ? 'admin.confirmDeauthorization' : 'admin.confirmAuthorization',
      target: `${university.name} (${university.ethAddress})`,
      ip: req.ip,
      result: 'success',
      details: `tx=${receipt.txHash} block=${receipt.blockNumber}`,
    });

    return res.json({
      university: {
        id: String(university._id),
        name: university.name,
        ethAddress: university.ethAddress,
        authorized: university.authorized,
        authorizedAt: university.authorizedAt,
        deauthorizedAt: university.deauthorizedAt,
      },
      txHash: receipt.txHash,
      blockNumber: receipt.blockNumber,
    });
  } catch (err) {
    return next(err);
  }
}

const confirmAuthorization = (req, res, next) => confirmRoleChange(req, res, next, { deauthorize: false });
const confirmDeauthorization = (req, res, next) => confirmRoleChange(req, res, next, { deauthorize: true });

/** GET /api/admin/activity — append-only audit trail (most recent first). */
async function getActivity(req, res, next) {
  try {
    const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(200).lean();
    return res.json({
      activity: logs.map((l) => ({
        id: String(l._id),
        at: l.createdAt,
        actor: l.actorEmail,
        role: l.actorRole,
        action: l.action,
        target: l.target,
        result: l.result,
        ip: l.ip,
        details: l.details,
      })),
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listUniversities,
  createUniversity,
  confirmAuthorization,
  confirmDeauthorization,
  getActivity,
};
