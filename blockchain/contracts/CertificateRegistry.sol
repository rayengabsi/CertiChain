// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title CertificateRegistry
 * @notice Anchors diploma fingerprints on-chain. Only a non-identifying certificate ID,
 *         the SHA-256 fingerprint of the original PDF, the issuer wallet and timestamps
 *         are stored. Personal data never enters this contract.
 *
 * Roles:
 *   - DEFAULT_ADMIN_ROLE : the deployer (platform admin). Grants/revokes ISSUER_ROLE,
 *                          can emergency-revoke any certificate.
 *   - ISSUER_ROLE        : one address per authorized university. Can issue certificates
 *                          and revoke the certificates IT issued.
 *
 * Documented semantics:
 *   - A deauthorized university can no longer issue, but can still revoke its own past
 *     certificates (blocking revocation would protect fraudsters, not users).
 *   - Deauthorization is NOT retroactive: previously issued certificates stay valid.
 *   - The contract is immutable by design (no proxy); recovery from a bug = redeploy.
 */
contract CertificateRegistry is AccessControl {
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");

    struct Certificate {
        address issuer;      // university wallet that issued (owner for revocation)
        bytes32 fingerprint; // SHA-256 of the original PDF bytes
        uint64 issuedAt;     // block timestamp; also acts as the existence flag (> 0)
        uint64 revokedAt;    // 0 = active
    }

    mapping(bytes32 => Certificate) private _certificates;

    // ── Events (immutable history) ────────────────────────────────────────────
    event CertificateIssued(bytes32 indexed certificateId, address indexed issuer, bytes32 fingerprint, uint64 timestamp);
    event CertificateRevoked(bytes32 indexed certificateId, address indexed revokedBy, uint64 timestamp);
    event IssuerAuthorized(address indexed issuer, address indexed authorizedBy, uint64 timestamp);
    event IssuerDeauthorized(address indexed issuer, address indexed deauthorizedBy, uint64 timestamp);

    // ── Custom errors (cheaper than require strings, explicit in tests) ───────
    error CertificateAlreadyExists(bytes32 certificateId);
    error CertificateNotFound(bytes32 certificateId);
    error CertificateAlreadyRevoked(bytes32 certificateId);
    error NotCertificateIssuer(bytes32 certificateId);
    error InvalidCertificateId();
    error InvalidFingerprint();
    error InvalidIssuerAddress();

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /**
     * @notice Register a diploma fingerprint. Restricted to ISSUER_ROLE (authorized universities).
     *         Checks-effects-interactions: all checks first, state change, event last.
     */
    function issue(bytes32 certificateId, bytes32 fingerprint) external onlyRole(ISSUER_ROLE) {
        if (certificateId == bytes32(0)) revert InvalidCertificateId();
        if (fingerprint == bytes32(0)) revert InvalidFingerprint();
        if (_certificates[certificateId].issuedAt != 0) revert CertificateAlreadyExists(certificateId);

        uint64 timestamp = uint64(block.timestamp);
        _certificates[certificateId] = Certificate(msg.sender, fingerprint, timestamp, 0);

        emit CertificateIssued(certificateId, msg.sender, fingerprint, timestamp);
    }

    /**
     * @notice Revoke a certificate. Restricted to the certificate's issuer-of-record
     *         or the admin (emergency). No ISSUER_ROLE check on purpose: a deauthorized
     *         university must still be able to revoke its own past certificates.
     */
    function revoke(bytes32 certificateId) external {
        Certificate storage cert = _certificates[certificateId];
        if (cert.issuedAt == 0) revert CertificateNotFound(certificateId);
        if (cert.revokedAt != 0) revert CertificateAlreadyRevoked(certificateId);
        if (msg.sender != cert.issuer && !hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) {
            revert NotCertificateIssuer(certificateId);
        }

        uint64 timestamp = uint64(block.timestamp);
        cert.revokedAt = timestamp;

        emit CertificateRevoked(certificateId, msg.sender, timestamp);
    }

    /**
     * @notice true ⇔ the certificate exists, the fingerprint matches and it is not revoked.
     */
    function verify(bytes32 certificateId, bytes32 fingerprint) external view returns (bool) {
        Certificate storage cert = _certificates[certificateId];
        if (cert.issuedAt == 0) return false;
        if (cert.fingerprint != fingerprint) return false;
        if (cert.revokedAt != 0) return false;
        return true;
    }

    /**
     * @notice Public certificate data (issuer, fingerprint, timestamps, existence).
     */
    function getCertificate(bytes32 certificateId)
        external
        view
        returns (address issuer, bytes32 fingerprint, uint64 issuedAt, uint64 revokedAt, bool exists)
    {
        Certificate storage cert = _certificates[certificateId];
        return (cert.issuer, cert.fingerprint, cert.issuedAt, cert.revokedAt, cert.issuedAt != 0);
    }

    /**
     * @notice Grant ISSUER_ROLE to a university wallet. Admin only. Zero address rejected.
     */
    function authorizeIssuer(address issuer) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (issuer == address(0)) revert InvalidIssuerAddress();
        _grantRole(ISSUER_ROLE, issuer);
        emit IssuerAuthorized(issuer, msg.sender, uint64(block.timestamp));
    }

    /**
     * @notice Revoke ISSUER_ROLE from a university wallet. Admin only.
     */
    function deauthorizeIssuer(address issuer) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (issuer == address(0)) revert InvalidIssuerAddress();
        _revokeRole(ISSUER_ROLE, issuer);
        emit IssuerDeauthorized(issuer, msg.sender, uint64(block.timestamp));
    }

    /**
     * @notice Convenience role check for UIs and the backend.
     */
    function isIssuerAuthorized(address issuer) external view returns (bool) {
        return hasRole(ISSUER_ROLE, issuer);
    }
}
