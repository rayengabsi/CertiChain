# CertiChain — Requirements Analysis

| | |
|---|---|
| **Phase** | 0 — Planning |
| **Version** | 1.0 (2026-11-11) |
| **Status** | Awaiting team review and approval |
| **Author** | Generated with AI assistance — see `docs/07-ai-usage-log.md`, entry AI-001 |

---

## 1. Purpose

This document defines **what** CertiChain must do before any code is written. It is the reference for the architecture, the security plan, the test plan and the 30-day roadmap. Every functional requirement carries an ID so that implementation, tests and documentation can be traced back to it.

## 2. Problem statement

Diploma fraud is a persistent, documented problem for universities and employers. Manual verification (phone calls, emails, paper archives) is slow, unreliable, and only works while the issuing institution is reachable and cooperative. A forged paper or scanned PDF is indistinguishable from a genuine one by inspection alone.

CertiChain's answer: when a university issues a diploma, the platform anchors a **SHA-256 fingerprint** of the original PDF, together with a **non-identifying certificate reference**, on a **public blockchain**. Anyone can later verify that:

1. the diploma they hold is byte-for-byte the one the university issued (hash match),
2. the university that issued it was authorized at issuance time,
3. the certificate has not been revoked,
4. the record cannot be silently altered — not even by CertiChain's administrators — because it lives on a public, tamper-evident ledger.

## 3. Scope

### 3.1 In scope (MVP)

- JWT authentication with four roles (admin, university, student) and public (recruiter) access.
- University authorization/deauthorization by admin, **enforced on-chain**.
- Diploma PDF upload with server-side validation and SHA-256 computation.
- Certificate issuance: on-chain fingerprint registration via a university-bound signer.
- Certificate retrieval and listing per university and per student.
- Certificate revocation by the issuing university only (enforced on-chain).
- Public verification with **three access modes**: certificate ID search, PDF upload, QR code.
- QR code generation for certificate sharing.
- Transaction history references (Etherscan links).
- Audit logging of security-relevant actions.
- Comprehensive contract tests and security tests with documented results.

### 3.2 Out of scope (explicitly excluded from the 30-day MVP)

| Excluded | Reason |
|---|---|
| IPFS document storage | Secondary feature; adds infrastructure risk. Server-side storage is more reliable for the demo. |
| Full student portal (profile editing, notifications) | Secondary per project brief; MVP portal is read/share only. |
| Email delivery infrastructure | No SMTP available; student activation uses codes delivered out-of-band by the university. |
| Contract upgradeability (proxies) | Adds complexity and risk; an immutable registry is simpler and more defensible for the MVP. |
| Real-mainnet deployment / real funds | Sepolia testnet only. |
| Mobile application, i18n, dark mode | Not required. |
| CI/CD pipelines | Stretch goal only if the MVP is complete and stable. |
| Antivirus scanning of uploads (ClamAV) | Stretch goal; size + magic-byte validation is the MVP control. |

## 4. Actors

| Actor | Authentication | Description |
|---|---|---|
| **Admin** | JWT (login) | Platform owner. Root of trust: authorizes/deauthorizes universities, monitors activity. Holds the contract's `DEFAULT_ADMIN_ROLE` via a server-side admin wallet. |
| **University** | JWT (login, created by admin) | Authorized issuer. Each university has a dedicated on-chain signer address holding `ISSUER_ROLE`. |
| **Student** | JWT (activates account with code from university) | Diploma holder. Reads and shares their own certificates. |
| **Recruiter / public** | **None** | Verifies certificates without registration. |
| **System (backend)** | Service identity | The Node.js API is the only component that talks to the blockchain, MongoDB and document storage. |

## 5. Use cases

| ID | Actor | Use case | Result |
|---|---|---|---|
| UC-01 | Student | Register account using activation code received from university | Student account activated, bound to their email |
| UC-02 | All roles | Log in with email + password | JWT issued; generic error on failure |
| UC-03 | Admin | Authorize a university | University user created; on-chain `ISSUER_ROLE` granted to its dedicated signer address |
| UC-04 | Admin | Deauthorize a university | On-chain role revoked; university can no longer issue |
| UC-05 | Admin | View system activity | Paginated audit log view |
| UC-06 | University | Upload diploma PDF + enter certificate info | PDF validated, SHA-256 computed server-side, certificate issued on-chain |
| UC-07 | University | View certificates issued by the university | Filtered, paginated list with status |
| UC-08 | University | Revoke a certificate issued by that university | On-chain revocation recorded; verification pages show REVOKED |
| UC-09 | Student | View own certificates | List of certificates where `studentEmail` matches |
| UC-10 | Student | Download own diploma | PDF streamed (authorization enforced) |
| UC-11 | Student | Share certificate link / QR code | Public verification URL + QR image |
| UC-12 | Recruiter | Verify by certificate ID | Status + certificate info + transaction references |
| UC-13 | Recruiter | Verify by uploading a diploma PDF | Server recomputes SHA-256 and compares against the anchored fingerprint |
| UC-14 | Recruiter | Verify via QR code scan | Camera opens the public verification page (same result as UC-12) |
| UC-15 | Anyone | Inspect the contract on Etherscan | Independent, out-of-band verification of the on-chain record |
| UC-16 | System | Audit-log security-relevant events | Append-only audit trail with actor, action, IP, result |

## 6. Functional requirements

Priorities: **M** = must have, **S** = should have, **C** = could have (cut first under time pressure).

### 6.1 Authentication & accounts (AUTH)

| ID | Requirement | Priority | Acceptance criteria |
|---|---|---|---|
| AUTH-01 | Email/password login for admin, university, student | M | Valid credentials → JWT (1 h); invalid → generic 401, both cases audit-logged |
| AUTH-02 | Passwords hashed with bcrypt (cost 12), never stored or logged in clear | M | Only bcrypt hashes in DB; no cleartext in logs |
| AUTH-03 | Student self-registration requires an activation code bound to the email issued by a university | M | Registering an email without a valid code fails; prevents account preemption |
| AUTH-04 | Admin/university accounts are created only by the admin | M | No public endpoint can create privileged accounts |
| AUTH-05 | JWT contains role and user ID, expires, and is validated on every protected route | M | Expired/tampered/unsigned tokens → 401 |
| AUTH-06 | Login endpoint rate-limited | M | >N attempts/15 min from one IP → 429 |

### 6.2 Admin (ADM)

| ID | Requirement | Priority | Acceptance criteria |
|---|---|---|---|
| ADM-01 | List universities with on-chain authorization status | M | Status shown matches on-chain role state |
| ADM-02 | Authorize university: create account + dedicated on-chain signer + grant `ISSUER_ROLE` | M | University can issue immediately after; grant transaction recorded |
| ADM-03 | Deauthorize university: revoke `ISSUER_ROLE` on-chain | M | Further issuance attempts rejected by the contract |
| ADM-04 | View audit log (filter/paginate) | S | Chronological, searchable by action/actor |
| ADM-05 | University signer keys encrypted at rest (AES-256-GCM) | M | DB contains only ciphertext; key material only in server memory |

### 6.3 Issuance (ISS)

| ID | Requirement | Priority | Acceptance criteria |
|---|---|---|---|
| ISS-01 | Upload endpoint accepts exactly one PDF per request (multipart) | M | Other field names / multiple files rejected |
| ISS-02 | Server validates file: size ≤ 10 MB, MIME `application/pdf`, magic bytes `%PDF-` | M | Renamed executables, oversized or empty files rejected with 400/413 |
| ISS-03 | SHA-256 computed server-side over the **exact uploaded bytes** | M | Hash of any client-supplied hash string is ignored |
| ISS-04 | Unique certificate ID (UUID v4) generated server-side | M | Two issuances never share an ID (DB unique index + on-chain duplicate revert) |
| ISS-05 | Same PDF bytes cannot be issued twice (unique index on SHA-256) | M | Duplicate upload rejected as business-level duplicate |
| ISS-06 | PDF stored with random server-generated filename outside any static directory | M | Original filename stored in DB only; no path derived from client input |
| ISS-07 | Issuance transaction signed by the **university's own signer** and confirmed before the API responds | M | `msg.sender` on-chain equals the university's registered address |
| ISS-08 | Transaction failure rolls the DB record back to a failed state and surfaces a clean error | M | No certificate shown as issued without an on-chain confirmation |
| ISS-09 | Certificate metadata: program, degree, student name + email (kept off-chain), issuance date | M | Metadata queryable by authorized roles only |

### 6.4 Verification (VER) — public, no registration

| ID | Requirement | Priority | Acceptance criteria |
|---|---|---|---|
| VER-01 | Verify by certificate ID | M | Returns status + info + tx references |
| VER-02 | Verify by PDF upload (server recomputes hash) | M | Modified document → "invalid/modified" result, never a false VALID |
| VER-03 | QR code resolves to public verification URL | M | Scanning opens the verification page for that certificate |
| VER-04 | Four unambiguous result states: VALID, REVOKED, NOT FOUND, INVALID/MODIFIED | M | Each state tested |
| VER-05 | Verification reads status **from the blockchain** (source of truth), DB only enriches display | M | A DB tamper cannot fake a VALID status |
| VER-06 | Results expose **no private student information** (no name/email) | M | Response fields limited to university, program, degree, dates, status, tx refs |
| VER-07 | Public endpoints rate-limited | M | >N req/min → 429 |

### 6.5 Revocation (REV)

| ID | Requirement | Priority | Acceptance criteria |
|---|---|---|---|
| REV-01 | Issuing university can revoke its own certificate | M | Only the certificate's issuer address (or admin wallet) succeeds on-chain |
| REV-02 | Repeated revocation rejected by the contract | M | Second revoke call reverts |
| REV-03 | Revocation reason stored off-chain, linked by certificate ID + tx hash | S | Reason visible to university/admin and on the verification page |
| REV-04 | Revocation by a different university rejected | M | On-chain issuer-ownership check + API 403 |

### 6.6 Student portal (STU)

| ID | Requirement | Priority | Acceptance criteria |
|---|---|---|---|
| STU-01 | List own certificates (matched by account email) | M | No cross-student visibility (tested) |
| STU-02 | Download own diploma PDF | M | Authorization enforced server-side |
| STU-03 | Get shareable link + QR code | M | Link/QR contain only the public verification URL |

### 6.7 Blockchain contract (CHN)

| ID | Requirement | Priority | Acceptance criteria |
|---|---|---|---|
| CHN-01 | `issue(certificateId, sha256Fingerprint)` restricted to `ISSUER_ROLE` | M | Unauthorized call reverts |
| CHN-02 | Duplicate `certificateId` rejected | M | Revert with custom error |
| CHN-03 | `verify(certificateId, fingerprint)` view returns true only if exists + hash matches + not revoked | M | Tested for all branches |
| CHN-04 | `revoke(certificateId)` restricted to the certificate's original issuer | M | Foreign issuer reverts |
| CHN-05 | Admin grant/revoke of `ISSUER_ROLE` | M | Deauthorized university cannot issue afterwards |
| CHN-06 | Events emitted for issuance, revocation, authorization changes | M | Events assertable in tests |
| CHN-07 | Zero-address and zero-fingerprint/ID input validation | M | Reverts with custom errors |
| CHN-08 | No personal data on-chain (only ID hash, fingerprint, issuer address, timestamps) | M | Reviewed in code review checklist |

### 6.8 Audit & QR (AUD/QR)

| ID | Requirement | Priority | Acceptance criteria |
|---|---|---|---|
| AUD-01 | Append-only audit log: actor, role, action, target, IP, result, timestamp | M | Every state-changing action and failed authorization attempt recorded |
| AUD-02 | Audit entries never contain passwords, keys or unnecessary PII | M | Reviewed by inspection + test |
| QR-01 | Server-side QR generation (PNG) of the public verification URL | M | QR scans to the correct URL |

## 7. Non-functional requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-01 | Security | All requirements in `docs/04-security.md` are implemented and tested; OWASP Top 10 mapped |
| NFR-02 | Performance | Verification by ID responds < 2 s (DB-cached path + one `eth_call`); PDF verification < 10 s |
| NFR-03 | Reliability | No certificate is reported VALID without an on-chain record; tx confirmation required before success responses |
| NFR-04 | Auditability | Every security-relevant event is reconstructable from audit logs + on-chain events |
| NFR-05 | Usability | Responsive UI; verification usable from a phone camera (QR) |
| NFR-06 | Maintainability | ESLint-clean code, conventional commits, PR review by the partner |
| NFR-07 | Portability | Develops and runs on Windows; deployment only needs Node + MongoDB URI + RPC URL |
| NFR-08 | Honesty | Test reports record expected vs **actual** results; limitations documented, not hidden |

## 8. Constraints and assumptions

- **30 calendar days**, two students, assumed ~4–6 focused hours/student/day alongside other coursework.
- Development on Windows 11 (Node 22, git 2.51 available; Docker and local MongoDB **not installed** — MongoDB Atlas free tier or local install needed by Day 2).
- Sepolia testnet (no real funds). Test ETH must be acquired early (risk R-01).
- One repository (monorepo) — single history, simpler coordination for a two-person team.
- Blockchain interaction happens **only through the backend** (per the project brief's architecture).

## 9. Traceability matrix (summary)

| Requirement group | Contract tests (CT-xx) | Security tests (SEC-xx) | See |
|---|---|---|---|
| CHN-01..08 | CT-01…CT-15 | — | `docs/04-security.md` §8 |
| AUTH, ADM | — | SEC-01…SEC-03, SEC-08, SEC-13 | `docs/04-security.md` §7 |
| ISS, VER | CT-02, CT-03, CT-05 | SEC-04…SEC-07, SEC-09…SEC-12, SEC-14, SEC-15 | `docs/04-security.md` §7 |

## 10. Alignment with evaluation criteria

| Criterion | How this document contributes |
|---|---|
| **A — Blockchain concepts & solution design (4 pts)** | §2 (why anchoring works), §6.4/6.7 (on-chain responsibilities), scope of on-chain vs off-chain data |
| **B — Contract dev, security & testing (6 pts)** | CHN/ISS/VER/REV requirements are written to be directly testable (each has an acceptance criterion) |
| **C — Technical Q&A (7 pts)** | Every requirement ID is a potential defense question; the team must be able to explain each one |
| **D — Generative AI usage (3 pts)** | This document was AI-assisted and is logged in `docs/07-ai-usage-log.md`; corrections made during review must be recorded there |

## 11. Open decisions (to confirm at approval)

| # | Decision | Default proposal |
|---|---|---|
| D1 | Language for frontend/backend | **JavaScript (ES modules) + ESLint** — fastest to master and defend; TypeScript is a stretch goal |
| D2 | MongoDB hosting | **MongoDB Atlas free tier** (no local install needed; works from university network) with local install as fallback |
| D3 | JWT client storage | **sessionStorage + 1 h expiry + strict CSP** — documented trade-off vs localStorage (XSS) and cookies (CSRF) in `docs/04-security.md` |
| D4 | Student activation | Activation code shown to the university at issuance, delivered out-of-band (printed/emailed by the university) |
| D5 | Duplicate PDF policy | One PDF (byte-identical) = one certificate; re-issuance of identical bytes is rejected |
