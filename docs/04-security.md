# CertiChain — Security Requirements, Threat Model and Test Plan

| | |
|---|---|
| **Phase** | Emergency MVP (scope change) |
| **Version** | 1.1 (2026-11-11) — v1.1: MetaMask signing model, confirm-endpoint forgery tests added |
| **Status** | Security test results executed and documented in `docs/test-report.md` |

> **Honesty rule (project brief §9):** passing tests do not prove security. Every control below has a test *and* a documented residual risk (§9). The final report must state limitations explicitly.

---

## 1. Security objectives

1. **Integrity**: a diploma not issued by an authorized university can never verify as VALID.
2. **Authorization**: every state-changing action is restricted by role — enforced in the API **and** re-enforced on-chain where applicable.
3. **Confidentiality**: student PII never leaves the backend boundary (never on-chain, never in public responses, never in logs).
4. **Accountability**: every security-relevant action is attributable (audit log + on-chain events).
5. **Availability**: public verification resists abuse (rate limits, input limits).

## 2. Assets and trust boundaries

| Asset | Where | Sensitivity |
|---|---|---|
| Diploma PDFs (student PII) | Backend storage + MongoDB | High — confidentiality + integrity |
| Student identity (name/email) | MongoDB only | High |
| SHA-256 anchors + issuer roles | Sepolia (public) | Public by design; integrity critical |
| University signer keys (encrypted) | MongoDB (AES-256-GCM) | Critical |
| JWT secret, master encryption key, admin key | Env / server only | Critical |
| Audit logs | MongoDB | High (integrity) |

```
UNTRUSTED                 │ SEMI-TRUSTED            │ TRUSTED
──────────────────────────┼─────────────────────────┼──────────────────────────
Recruiter (public, no     │ Authenticated users     │ Backend (ZERO private keys:
auth) ── rate-limited,    │ (admin/university)      │  read-only chain access,
strictly validated input  │ + their MetaMask       │  verifies every frontend-
                          │   wallets sign chain   │  claimed tx on-chain)
                          │   writes               │ MongoDB · document store
                          │                         │ Hardhat node / Sepolia
                          │                         │ (contract = public
                          │                         │  tamper-evident record)
```

**Key v1.1 change:** chain *writes* (issue/revoke/authorize) are signed by MetaMask in the browser; the backend has no keys at all. The new attack surface this creates — *the backend trusting a frontend-claimed transaction hash* — is closed by on-chain verification of every receipt/event (threat T-15, tests SEC-17/SEC-18).

## 3. Threat model (STRIDE, per boundary)

| ID | Threat | Category | Vector | Primary control |
|---|---|---|---|---|
| T-01 | Forged diploma verifies as VALID | Tampering | Modified PDF, hash collision, forged record | SHA-256 anchor + on-chain comparison (VER-05: chain is source of truth) |
| T-02 | Unauthorized user issues certificates | Spoofing/Elevation | Stolen JWT, role tampering, fake university | JWT signature + RBAC middleware + **contract `ISSUER_ROLE` check** (defense in depth) |
| T-03 | Attacker preempts a student's account | Spoofing | Registers victim's email before them | Activation code bound to email, issued only by universities (AUTH-03) |
| T-04 | University revokes another university's certificate | Elevation | API abuse or crafted tx | API ownership check + contract `msg.sender == issuer` (double enforcement) |
| T-05 | Malicious file upload | Tampering/DoS | `.exe` renamed `.pdf`, oversized file, path traversal in filename, zip-bomb-like PDF | Magic-byte + MIME + size validation; server-generated storage names; private dir |
| T-06 | Credential stuffing / brute force | Spoofing/DoS | Repeated logins | Rate limiting + bcrypt cost 12 + generic errors + audit |
| T-07 | Injection (NoSQL, log, XSS) | Tampering | `{"email":{"$gt":""}}`, XSS payloads in metadata | Strict validators + typed schemas; React auto-escaping; no `dangerouslySetInnerHTML` |
| T-08 | Information disclosure | Info disclosure | Verbose errors, stack traces, PII in public responses/logs | Central error handler; VER-06 field whitelist; log hygiene rules |
| T-09 | Server-side key theft | Disclosure | DB dump, memory dump, logs | AES-256-GCM at rest, decrypt in memory only, never logged, keys never in Git |
| T-10 | Secret leakage via repository | Disclosure | Committed `.env` or key files | `.gitignore` from commit #1, `.env.example` only, review checklist |
| T-11 | Repudiation of issuance/revocation | Repudiation | "We never issued that" | On-chain events (issuer, timestamp) + audit logs |
| T-15 | Forged transaction confirmation | Elevation | Client posts a confirm request with a txHash that is bogus, someone else's, or from a mismatched event | Backend parses the receipt on-chain itself: event name, certificateId, fingerprint, issuer wallet and tx.from must all match; pending record must belong to the caller's university |
| T-16 | Blockchain record manipulation | Tampering | (out of our control) | Public chain assumption; Etherscan inspection (UC-15) |
| T-13 | Verification DoS | DoS | Hammering public endpoints | Rate limits on `/api/verify/*` |
| T-14 | JWT tampering / forgery | Spoofing | `alg:none`, role claim edit, expired reuse | Signed HS256, explicit algorithm check, expiry |

## 4. OWASP Top 10 (2021) mapping

| OWASP risk | CertiChain control | Test |
|---|---|---|
| A01 Broken Access Control | RBAC middleware on every protected route; ownership checks; public routes return no PII | SEC-01, SEC-02, SEC-06 |
| A02 Cryptographic Failures | bcrypt(12), SHA-256, AES-256-GCM, JWT HS256 w/ 64-byte random secret | SEC-03, SEC-13 |
| A03 Injection | express-validator on all inputs; typed Mongoose schemas; no dynamic queries from raw bodies | SEC-09 |
| A04 Insecure Design | This threat model; on-chain re-enforcement of API rules; chain-first verification | design review |
| A05 Security Misconfiguration | helmet (CSP, noSniff, frameguard), CORS whitelist, env validation at boot | SEC-14 |
| A06 Vulnerable Components | Pinned versions, `npm audit` in security sprint, minimal dependency set | Phase 8 |
| A07 Identification & Auth Failures | Rate-limited login, generic errors, account lockout awareness, activation codes | SEC-03, SEC-12 |
| A08 Software & Data Integrity Failures | Server-side hash computation (never trust client hashes); tx confirmation before success | SEC-04, SEC-05 |
| A09 Logging & Monitoring Failures | Append-only audit log w/ actor, IP, result; on-chain events | SEC-15 |
| A10 SSRF | No user-supplied URLs fetched server-side → not applicable (documented) | — |

## 5. Smart contract security checklist (Criterion B)

- [ ] OpenZeppelin `AccessControl` (audited) — no hand-rolled `owner == msg.sender` patterns
- [ ] `ISSUER_ROLE` on issue; `DEFAULT_ADMIN_ROLE` on authorize/deauthorize
- [ ] Reentrancy: no external calls, no ETH transfers, no `callvalue` logic — surface analyzed and **documented as empty**
- [ ] Checks-effects-interactions order in all mutators; events last
- [ ] Custom errors; zero-address validation (authorize), zero-fingerprint/ID validation (issue)
- [ ] Duplicate issuance impossible (`issuedAt != 0` existence flag); repeated revocation impossible (`revokedAt != 0`)
- [ ] Revocation restricted to certificate's issuer (issuer-ownership test CT-07)
- [ ] Solidity ≥ 0.8.24 (checked arithmetic — no overflow/underflow)
- [ ] No `tx.origin`, no assembly, no `delegatecall`, no `selfdestruct`, no unbounded loops
- [ ] Minimal storage (3 slots/certificate); no PII on-chain (reviewed in checklist)
- [ ] Source verified on Etherscan after deployment (transparency)
- [ ] Documented non-goals: no upgradeability, deauthorization not retroactive, admin cannot revoke issuer certificates (spec: university-only revocation)

## 6. Backend & frontend security controls

| Area | Control |
|---|---|
| Passwords | bcrypt cost 12; length 10–72 bytes enforced (bcrypt truncates >72); NIST 800-63B style policy (length over composition) |
| JWT | HS256 with 64-byte random secret; explicit `algorithms: ['HS256']` on verify; 1 h expiry; claims: sub, role, universityId; `sessionStorage` on client (trade-off documented: XSS-readable but tab-scoped and not persistent — CSP + React escaping mitigate; no cookies → no CSRF surface) |
| Upload pipeline | Multer limits (10 MB, files:1, field name fixed); MIME `application/pdf` **and** magic bytes `%PDF-` **and** `%%EOF` trailer within last 2 KB; storage name = UUID (client filename never touches the filesystem); uploads dir outside static serving; original filename sanitized + length-capped in DB |
| Hash computation | Always server-side from streamed bytes; client-supplied hash fields are ignored entirely |
| Rate limiting | Global 300/15 min/IP; auth 10/15 min/IP; verify 60/min/IP; upload 20/h/user — configurable constants |
| Headers | helmet: CSP (`default-src 'self'`, `img-src 'self' data:` for QR data-URLs), `X-Content-Type-Options: nosniff`, frameguard, referrer-policy; HSTS in production |
| CORS | Whitelist `FRONTEND_ORIGIN` only; no credentials; no wildcard |
| Errors | Central handler → `{error: {code, message}}`; no stacks, no internals; 401 = generic "invalid credentials" |
| Logging hygiene | Log: actor, action, target, IP, result. **Never log**: passwords, tokens, keys, file bytes, student email in public-path logs |
| Dependency hygiene | Version pinning, `npm audit` in Phase 8, minimal dependency set (brief rule 12) |
| Frontend | React auto-escaping; `dangerouslySetInnerHTML` banned; API responses treated as untrusted data; production build for demo |

## 7. Security test plan — API/backend (Jest + Supertest)

| ID | Test (threat) | Method | Expected result | Actual (fill in Phase 8) |
|---|---|---|---|---|
| SEC-01 | Unauthorized access: no/invalid JWT on protected routes | Call protected endpoints w/o token | 401 | _TBD_ |
| SEC-02 | Role escalation: student token on university/admin endpoints | Forge valid student JWT, call admin/university routes | 403 (role checked server-side) | _TBD_ |
| SEC-03 | Role escalation via registration: submit `role:"admin"` in register body | POST /auth/register with role field | Field ignored/rejected; no privileged account created | _TBD_ |
| SEC-04 | PDF modification: flip one byte of an issued PDF, verify | POST /verify/file with tampered PDF | "invalid or modified" — never VALID | _TBD_ |
| SEC-05 | Duplicate certificate attack: re-upload identical PDF | POST /certificates twice (same bytes) | 409 duplicate rejection | _TBD_ |
| SEC-06 | Unauthorized revocation: university B revokes university A's certificate | POST revoke with B's token | 403 from API; contract would also revert | _TBD_ |
| SEC-07 | Repeated revocation | Revoke twice | Second call → 409/contract revert surfaced | _TBD_ |
| SEC-08 | Fake university issuance: deauthorized university issues | Deauthorize, then attempt issue | Contract reverts (role lost); API rejects | _TBD_ |
| SEC-09 | File upload: `.exe` renamed to `.pdf` | Upload fake | 400 (magic bytes fail) | _TBD_ |
| SEC-10 | File upload: 15 MB PDF / empty file / wrong field | Upload variants | 413 / 400 | _TBD_ |
| SEC-11 | Path traversal: filename `../../evil.pdf` | Upload with malicious filename | Stored as UUID; traversal never reaches fs paths | _TBD_ |
| SEC-12 | Rate limiting: burst auth/verify | >limit requests | 429 after threshold | _TBD_ |
| SEC-13 | JWT attacks: expired, tampered payload, `alg:none`, wrong signature | Crafted tokens | 401 for all | _TBD_ |
| SEC-14 | Information disclosure: nonexistent cert ID, error paths | GET /verify/random-uuid; trigger 500 | No PII, no stack traces, no existence oracle for student data | _TBD_ |
| SEC-15 | Audit trail: failed logins, failed authz, issuance, revocation | Perform actions, inspect audit collection | All recorded with actor + result | _TBD_ |
| SEC-16 | ~~Student account preemption~~ N/A tonight — no public registration endpoint exists (student accounts postponed); SEC-03 covers role escalation via registration | POST /auth/register → 404 | Endpoint does not exist | _TBD_ |
| SEC-17 | Confirm-forgery: university confirms issuance with a **bogus tx hash** | POST confirm {txHash: fake} | Rejected — tx not found / no matching event | _TBD_ |
| SEC-18 | Confirm-forgery: confirm with a **real tx from a different certificate / different university / different hash** | Cross-confirm attempts | Rejected — event args (certId, fingerprint, issuer, from) must all match | _TBD_ |
| SEC-19 | Confirm a **pending certificate belonging to another university** | University B confirms A's pending cert | 404/403 — ownership checked server-side | _TBD_ |

## 8. Smart contract test plan (Hardhat/Chai — brief §6 mandatory list + extras)

| ID | Scenario | Expected |
|---|---|---|
| CT-01 | Authorized university issues | Stores fingerprint; emits `CertificateIssued`; issuer recorded |
| CT-02 | Unauthorized address issues | Reverts (missing `ISSUER_ROLE`) |
| CT-03 | Duplicate certificate ID | Reverts `CertificateAlreadyExists` |
| CT-04 | Correct hash verification | `verify()` → true |
| CT-05 | Incorrect hash verification | `verify()` → false |
| CT-06 | Issuer revokes own certificate | `revokedAt` set; emits `CertificateRevoked`; verify → false |
| CT-07 | Non-issuer (other university / stranger) revokes | Reverts `NotCertificateIssuer` |
| CT-08 | Repeated revocation | Reverts `CertificateAlreadyRevoked` |
| CT-09 | Admin authorizes then deauthorize; issuance before/after | Allowed before; `reverts` after deauthorization |
| CT-10 | Zero address in authorize | Reverts |
| CT-11 | Zero fingerprint / zero certificate ID in issue | Reverts |
| CT-12 | Verify nonexistent ID | false (no revert, no data leak) |
| CT-13 | `getCertificate` returns correct fields | issuer, fingerprint, timestamps match |
| CT-14 | Authorization events emitted | `IssuerAuthorized` / `IssuerDeauthorized` |
| CT-15 | Coverage gate | ≥ 90% lines/branches on the contract |

## 9. Residual risks & honest limitations (report must include these)

1. **Hash anchoring is a membership oracle.** Anyone holding a candidate PDF can test it against the chain — that is the feature (verification). Salting would break public hash verification; unsalted SHA-256 is an accepted, documented trade-off.
2. ~~Server-side signer custody~~ **Eliminated in v1.1**: the backend holds zero private keys (MetaMask model). The replaced risk is T-15 (forged confirmations), mitigated and tested via SEC-17/18/19.
3. **Admin is a single root of trust** for university identity. Standard for anchored-PKI designs; on-chain grants make admin actions publicly auditable.
4. **Immutable contract** — no patching in place. Recovery = redeploy + re-authorization. Mitigated by test-first development.
5. **Deauthorization is not retroactive** (documented semantic).
6. **No professional audit.** Student tests ≠ formal verification/audit; say this explicitly (brief §9). Consider Slither static analysis as a stretch goal in Phase 8.
7. **Rate limiting is per-instance in memory** — fine for a single-server demo deployment; document as a limitation if scaling were real.
8. **Testnet assumptions.** Sepolia availability and faucet policy are external risks (see `docs/05-risks.md` R-01).

## 10. Security documentation checklist (final report)

- [ ] Threat model table (§3) included with discussion
- [ ] OWASP mapping (§4) included
- [ ] Contract security checklist (§5) signed off during code review
- [ ] Test report: every SEC/CT ID with **expected vs actual** results (`docs/test-report.md`)
- [ ] Residual risks (§9) discussed openly — limitations framed as conscious trade-offs
- [ ] Key management narrative: how university keys are created, encrypted, used, destroyed
- [ ] Git hygiene evidence: `.gitignore` from first commit, no secrets in history
