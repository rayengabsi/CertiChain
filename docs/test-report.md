# CertiChain — Test Report (executed results)

| | |
|---|---|
| **Version** | 1.0 (2026-11-11) |
| **Scope** | Emergency MVP — local Hardhat chain (chainId 31337) + local MongoDB + Express API + React SPA |
| **Environment** | Windows 11 · Node.js 20 · MongoDB 7 (`mongodb://127.0.0.1:27017`) · Hardhat 2.x · Solidity 0.8.24 |
| **How to reproduce** | `blockchain/`: `npm test`, `npm run coverage` · `backend/`: `npm test`, `npm run e2e` · `frontend/`: `npm run build` |

> **Honesty rule (project brief §9):** the results below are the *actual* output of the commands listed, run on the date above. A green suite does **not** prove the system is secure. Every limitation is stated in §6.

---

## 1. Summary

| Suite | Command | Result |
|---|---|---|
| Smart-contract tests | `npx hardhat test` (in `blockchain/`) | **23 passed / 23** |
| Smart-contract coverage | `npx hardhat coverage` | **100 % stmts · 96.43 % branch · 100 % funcs · 100 % lines** |
| Backend security & lifecycle tests | `npm test` (in `backend/`) | **23 passed / 23** (2 suites) |
| End-to-end demo (real chain + real API + real DB) | `npm run e2e` (in `backend/`) | **ALL CHECKS PASSED** (26 assertions) |
| Frontend production build | `npm run build` (in `frontend/`) | **built OK** — 255 modules, 1.5 s |
| Frontend in-browser smoke test | manual (browser) | Landing, public verify (REVOKED), admin dashboard, university dashboard all render and function |

---

## 2. Smart-contract tests — `blockchain/test/CertificateRegistry.test.js`

Command: `npx hardhat test` → **23 passing (629 ms)**.

| ID | Scenario | Expected | Actual |
|---|---|---|---|
| CT-01 | Authorized university issues | stores fingerprint, emits `CertificateIssued`, issuer recorded | ✅ pass |
| CT-02 | Unauthorized address issues | reverts (missing `ISSUER_ROLE`) | ✅ pass |
| CT-03 | Duplicate certificate ID | reverts `CertificateAlreadyExists` | ✅ pass |
| CT-04 | Correct hash verification | `verify()` → true | ✅ pass |
| CT-05 | Incorrect hash verification | `verify()` → false | ✅ pass |
| CT-06 | Issuer revokes own certificate | `revokedAt` set, emits `CertificateRevoked`, verify → false | ✅ pass |
| CT-07 | Non-issuer revokes (other university / stranger) | reverts `NotCertificateIssuer` | ✅ pass |
| CT-08 | Repeated revocation | reverts `CertificateAlreadyRevoked` | ✅ pass |
| CT-09 | Admin authorizes → deauthorize; issuance before/after | allowed before, reverts after | ✅ pass |
| CT-10 | Zero address in `authorizeIssuer` | reverts | ✅ pass |
| CT-11 | Zero fingerprint / zero certificate ID in `issue` | reverts | ✅ pass |
| CT-12 | Verify nonexistent ID | false, no revert, no data leak | ✅ pass |
| CT-13 | `getCertificate` returns correct fields | issuer/fingerprint/timestamps match | ✅ pass |
| CT-14 | Authorization events emitted | `IssuerAuthorized` / `IssuerDeauthorized` | ✅ pass |
| CT-15 | Coverage gate (≥ 90 % lines/branches) | ≥ 90 % | ✅ **100 % stmts, 96.43 % branch, 100 % funcs, 100 % lines** |

Extra tests beyond the mandatory list (all passing): admin emergency revocation; a **deauthorized university can still revoke its own past certificate** (documented semantic); full lifecycle trail (issue → revoke → query).

**Coverage note.** The 3.57 % uncovered branch is the `NotCertificateIssuer` revert path in the admin-emergency-revoke branch combination; the behaviour itself is asserted by CT-07. This is reported rather than hidden.

---

## 3. Backend tests — `backend/tests/`

Command: `npm test` → **Test Suites: 2 passed, 2 total · Tests: 23 passed, 23 total**.

The suite runs against the **real Express app** and a **real local MongoDB** (`certichain_test`, dropped afterwards). Only `blockchain.service` is mocked, because transactions cannot be mined inside Jest; the on-chain confirmation logic is therefore additionally proven for real by the E2E script (§4).

### 3.1 Security requirements (`security.test.js`, 22 tests)

| ID | Test | Expected | Actual |
|---|---|---|---|
| SEC-01 | No / malformed / invalid JWT on protected routes | 401 | ✅ 401 (all three routes) |
| SEC-02 | Role escalation: university token on admin route, admin token on issuance, unknown role | 403 | ✅ 403 |
| SEC-03 | `role:"admin"` in a request body | role ignored; no privilege escalation | ✅ role stays `university` |
| SEC-04 | One-byte modification of an issued PDF | never VALID | ✅ **404 `not_found`** (see deviation D-1) |
| SEC-05 | Re-upload identical PDF (same / other university) | 409, no reference leak to a foreign university | ✅ 409 `PENDING_EXISTS`; reference returned only to the owner |
| SEC-06 | University B reads/revokes A's certificate | rejected | ✅ **404** (see deviation D-2) |
| SEC-07 | Repeated revocation | rejected | ✅ 409 |
| SEC-08 | Deauthorized university issues | contract reverts | ✅ proven in E2E §4 step 8 (`AccessControlUnauthorizedAccount`) |
| SEC-09 | `.exe` renamed `.pdf`; wrong MIME | 400 | ✅ 400 (magic bytes / MIME) |
| SEC-10 | Empty file / oversized file / wrong field name | 400 / 413 / 400 | ✅ 400 / 413 / 400 |
| SEC-11 | Path traversal in filename `../../evil.pdf` | stored under a random UUID; traversal never reaches fs | ✅ 201, stored as `<uuid>.pdf`, file exists at the safe path |
| SEC-12 | Auth burst over the limit | 429 after threshold | ✅ 200,200,200 → **429** (`rateLimit.test.js`) |
| SEC-13 | Expired / tampered / wrong-signature / `alg:none` JWT | 401 for all | ✅ 401 |
| SEC-14 | Unknown cert ID; malformed input; malformed JSON | no PII, no stack, clean error | ✅ 404 `not_found`, 400, 400 `BAD_JSON` |
| SEC-15 | Failed login + successful upload recorded | actor + IP + result present | ✅ both audit rows found |
| SEC-16 | Public registration endpoint | does not exist | ✅ 404 |
| SEC-17 | Confirm with a bogus / unknown / failed tx | rejected | ✅ 400 (malformed), 502 (unknown tx), 400 (failed tx); record stays `pending` |
| SEC-18 | Confirm with a real-but-mismatched tx | rejected | ✅ 400 for wrong certId / fingerprint / issuer / target; **403** for wrong sender; record stays `pending`; genuine receipt then succeeds |
| SEC-19 | University B confirms A's pending certificate | rejected | ✅ 404 |

Plus two service-basics tests: `/api/health` reports the chain config (✅ `connected:true`), and unknown routes return clean JSON with no stack trace (✅ 404 `NOT_FOUND`).

### 3.2 Lifecycle (happy path, `security.test.js`)

`upload → confirm on-chain → verify by ID → verify by file → revoke → verify revoked` — ✅ all assertions pass, including:
- server-computed `sha256` matches, `fingerprintBytes32 === '0x'+sha256`;
- the QR payload encodes `http://localhost:5173/verify/<id>` as a PNG data-URL;
- **VER-06**: the public response contains **no** `studentName` / `studentEmail` (asserted on the serialized body);
- repeated revocation → 409.

---

## 4. End-to-end demo — `backend/scripts/e2e-demo.js`

Command: `npm run e2e` → **E2E DEMO: ALL CHECKS PASSED**.

This drives the **real local blockchain** with **real signed transactions** (Hardhat dev keys, simulating exactly what MetaMask signs in the browser), against the **real API** and the **real MongoDB**.

| Step | Assertion | Result |
|---|---|---|
| 1 | API health ok; backend can reach the chain; admin login | ✅ |
| 2 | Admin registers the university (wallet `0x7099…79c8`) | ✅ |
| 3 | Admin wallet signs `authorizeIssuer()` on-chain; backend verifies the receipt | ✅ |
| 4 | University uploads a PDF; **server-side SHA-256 equals the locally computed hash** | ✅ |
| 5 | University wallet signs `issue()`; backend verifies the `CertificateIssued` event; chain stores fingerprint + issuer | ✅ (4 assertions) |
| 6 | Public verify by ID → **VALID**; by file → **VALID**; no PII in the public response; **tampered file → `not_found`** | ✅ |
| 7 | University wallet signs `revoke()`; backend verifies the `CertificateRevoked` event; verify → **REVOKED** | ✅ |
| 8 | Deauthorized university attempts to issue → **contract reverts** with `AccessControlUnauthorizedAccount` | ✅ |
| 9 | University re-authorized (restores the UI demo state) | ✅ |

Sample run artefacts (freshly generated each run):

```
certificateId: 6309a8f4-6008-4282-97b3-d8b6591080a8
SHA-256:       bb43d5fa4f0070364b4a1a97d31f9a5e3e06aebf996e7ca1250440431af47c81
issue tx:      0xc65d52cf51defec4d45e9737bbb5d8cccf2c3f716aacbaf50eb580904547ca87
revoke tx:     0x6f564c27565e8d61f29f5d0f3231c949f3cb9603178acb574d9a5d8a57acedc3
```

Step 8 is the single most important piece of evidence for **criterion B**: the API is bypassed entirely and the *contract itself* refuses the transaction because the caller no longer holds `ISSUER_ROLE`. Authorization is enforced on-chain, not merely in the backend.

---

## 5. Frontend verification

| Check | Method | Result |
|---|---|---|
| Production build | `npm run build` | ✅ 255 modules transformed, `dist/` produced (1.5 s) |
| Landing page renders | browser | ✅ hero + verification widget, **no console errors** (only React Router v7 future-flag warnings) |
| Public verify by ID | browser → `/verify/<revoked-id>` | ✅ renders **REVOKED** with university, program, degree, dates and issue tx — **and no student PII** |
| `/api` dev proxy | browser → `/api/health` | ✅ 200 (Vite proxy → Express) |
| Admin dashboard | browser login as admin | ✅ live university list with DB-mirror status, wallet connect, create form, activity log |
| University dashboard | browser login as university | ✅ shows university name + on-chain **AUTHORIZED** badge, issue form, certificate list |

Frontend tests are manual (no component-test runner in the emergency scope). This is a documented gap — see §6.

---

## 6. Deviations, residual risks and honest limitations

**Deviations from the planned expected results**

- **D-1 (SEC-04).** The plan said a tampered PDF should report *"invalid or modified"*. In practice, because SHA-256 has the avalanche property, a modified file simply does not match **any** registered fingerprint and resolves to **`not_found`** — which is the correct tamper-evidence. The `invalid_or_modified` status is reserved for the (unreachable in normal operation) case where the DB record and the on-chain fingerprint diverge. The E2E script and `docs/06-roadmap.md` were updated to reflect this.
- **D-2 (SEC-06).** The plan said *403*; the implementation returns **404** so that university B cannot use the API as an existence oracle for university A's certificates. Stricter, and intentional.
- **D-3 (SEC-08).** Not exercised in the Jest suite (which mocks the chain); proven instead by the real E2E step 8. Documented so the evidence is not overstated.
- **D-4.** `docs/04-security.md` §5–§6 still list controls from the *pre-emergency* design (AES-256-GCM server-side signer-key custody, student accounts/activation codes, Sepolia/Etherscan verification). These are **out of tonight's scope**: the MetaMask model removes server key custody entirely, and student accounts are postponed. They remain in the backlog.

**Residual risks (must be stated in the defense — brief §9)**

1. **Hash anchoring is a membership oracle** — anyone with a candidate PDF can test it against the chain. That is the feature; unsalted SHA-256 is a documented trade-off (salting would break public verification).
2. **The admin is a single root of trust** for university identity. On-chain grants make admin actions publicly auditable.
3. **The contract is immutable** — no patching in place; recovery = redeploy + re-authorization.
4. **Deauthorization is not retroactive** — a deauthorized university can still revoke its own past certificates (asserted by a contract test).
5. **No professional audit** — student tests are not formal verification. Slither static analysis is a backlog item.
6. **Rate limiting is per-instance in memory** — fine for a single-server demo; a limitation if scaled.
7. **No frontend component tests** and **no automated accessibility checks** — the UI was verified manually.
8. **Local-chain assumptions** — the demo runs on Hardhat (chainId 31337); Sepolia is a backlog item.

**Dependency audit (`npm audit`)**

- `backend/`: 6 **low**-severity advisories (transitive, no fix without breaking changes). Not exploitable in the documented flow; recorded honestly rather than hidden.
- `blockchain/`: advisories in the **Hardhat development tooling only** (not shipped to production). Recorded as-is.

---

## 7. Conclusion

All four evaluation criteria have concrete evidence:

- **(A) Blockchain concepts/architecture** — on-chain/off-chain split, SHA-256 anchoring, chain-as-source-of-truth, MetaMask signing model (E2E + `docs/02-architecture.md`).
- **(B) Smart contracts/security/testing** — 23 contract tests, **100 % statement coverage**, 23 backend security tests, real on-chain enforcement proven end-to-end, custom errors, OpenZeppelin `AccessControl`.
- **(C) Technical Q&A** — every command, file and expected result is documented in the README and this report.
- **(D) Responsible AI usage** — `docs/07-ai-usage-log.md`, including the real bugs found and corrected.

The most important honest statement: **these tests demonstrate that the specific, enumerated attacks fail. They do not prove the system is secure.** A professional audit and the backlog items above would be required before any real-world use.
