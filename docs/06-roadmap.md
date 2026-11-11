# CertiChain — 30-Day Development Roadmap (Two-Student Team)

| | |
|---|---|
| **Phase** | 0 — Planning |
| **Version** | 1.0 (2026-11-11) |
| **Status** | Awaiting approval |

---

## 1. Working agreement

- **Student A — blockchain & backend lead**: smart contract, tests, API, key management, deployment.
- **Student B — frontend & integration lead**: React app, API integration, UX for all four roles, demo flows.
- Both share: security testing (Phase 8), documentation, defense preparation. **Every student must be able to explain every component** (criterion C is 7 points — the largest).
- Daily 15-minute sync (what I did / what's next / blockers).
- **Git discipline**: feature branches (`feat/…`), conventional commits, push after every completed task, partner reviews before merging to `main`.
- Working assumption: ~4–6 focused hours per student per day.

## 2. Environment baseline (verified 2026-11-11)

| Tool | State | Action needed |
|---|---|---|
| Node.js v22.20.0, npm 10.9.3, git 2.51.0 | ✅ installed | none |
| Git identity + GitHub push access | ✅ working | none |
| MongoDB | ❌ missing | Day 2: Atlas cluster (R-02) |
| Docker | ❌ not installed | Not needed (Atlas chosen) |
| Sepolia test ETH | ⬜ not yet acquired | By Day 10 (R-01) |

## 3. Phase overview

| Phase | Days | Focus | Milestone |
|---|---|---|---|
| 0 | 1 | Planning, docs, repo init | **Done** (this commit) |
| 1 | 2–3 | Scaffolding: three workspaces, env, lint, CI-less test scripts | M0: repo runs |
| 2 | 4–7 | Smart contract + full test suite | **M1: contract complete & tested** |
| 3 | 8–11 | Backend core: models, auth (JWT/bcrypt), RBAC, validators, audit | **M2: auth/RBAC E2E** |
| 4 | 12–14 | Upload pipeline: PDF validation, SHA-256, storage | **M3: PDF → hash → DB** |
| 5 | 15–18 | Blockchain integration: deploy, university wallets, issuance tx | **M4: on-chain issuance E2E** |
| 6 | 19–21 | Public verification + QR + revocation E2E | **M5: verify by ID/PDF/QR** |
| 7 | 22–23 | Admin dashboard, student portal, polish | M6: all roles functional |
| 8 | 24–26 | Security testing sprint (SEC-01…16), fixes, test report | **M7: security tests green & documented** |
| 9 | 27–28 | Sepolia deployment, Etherscan verification, E2E smoke, demo data | **M8: live on Sepolia** |
| 10 | 29–30 | Docs finalization, defense Q&A prep, demo rehearsal, buffer | **M9: defense-ready** |

## 4. Day-by-day plan

### Week 1 — Foundation & contract (criterion B starts here)

| Day | Student A (contract/backend) | Student B (frontend) |
|---|---|---|
| **1** | ✅ Phase 0: planning docs, repo init, first commits | ✅ Phase 0 (shared) |
| **2** | Scaffold `backend/` (Express, ESLint, env config, health route); create Atlas cluster | Scaffold `frontend/` (Vite+React+Tailwind+Router, ESLint); landing page |
| **3** | Scaffold `blockchain/` (Hardhat config, clean sample, deploy script) | API client, `AuthContext`, layout components, login/register pages |
| **4** | `CertificateRegistry` v1: roles, struct, `issue`, custom errors | Protected routes + role guards; dashboard shells |
| **5** | `verify`, `getCertificate`, `revoke`, `authorizeIssuer`, `deauthorizeIssuer` | University dashboard shell; certificate table components |
| **6** | Contract tests CT-01…08 (issuance/revocation paths) | **Review A's contract tests (pair)**; verification page shell |
| **7** | Tests CT-09…15, coverage ≥ 90%, natspec comments → **M1** | Review coverage output; document contract design in report draft |

### Week 2 — Backend core & upload pipeline

| Day | Student A | Student B |
|---|---|---|
| **8** | Mongoose models (User, University); DB connection; env validation | Issuance form UI (file picker + metadata + validation UX) |
| **9** | Auth: register (activation codes), login, `/me`; bcrypt + JWT | Wire auth API; error/loading states |
| **10** | RBAC middleware, validators, central error handler | University dashboard on real API |
| **11** | AuditLog model + middleware → **M2** | Certificate list page + status badges |
| **12** | Upload middleware: multer limits, MIME + magic bytes, size | Upload UX: progress, validation errors, file preview |
| **13** | `hash.service` (SHA-256), `storage.service` (UUID names, private dir); hash round-trip test | Certificate detail page |
| **14** | Certificate model + create-pending flow + unit tests → **M3** | Student dashboard (list) |

### Week 3 — Blockchain integration & verification

| Day | Student A | Student B |
|---|---|---|
| **15** | `blockchain.service` (ethers v6), deploy script, local deploy | Share-link component; QR placeholder |
| **16** | `issuerWallet.service` (generate, AES-GCM encrypt, load); tx queue | Admin dashboard shell; universities table |
| **17** | Issue-on-chain flow + confirmations + reconcile | Issuance flow E2E together with A (pair session) |
| **18** | Admin authorize/deauthorize endpoints (chain + DB) → **M4** | Admin university management UI |
| **19** | Public verify endpoints (by ID, by file) | Verification page: ID search + PDF upload modes |
| **20** | `qr.service` + QR endpoint | QR display + 4 result-state UI (VALID/REVOKED/NOT FOUND/INVALID) |
| **21** | Revocation endpoint + E2E | Revocation UI + verification page reacts → **M5** |

### Week 4 — Security, deployment, defense

| Day | Student A | Student B |
|---|---|---|
| **22** | Audit-log API + pagination | Admin activity viewer UI |
| **23** | Revocation hardening; authz unit tests | Student download + share polish → M6 |
| **24** | Security tests SEC-01…05 (with B) | Security tests SEC-01…05 (with A) |
| **25** | SEC-06…11 | SEC-12…16 |
| **26** | Fix findings; `npm audit`; coverage; write `docs/test-report.md` → **M7** | Same — pair session |
| **27** | **Sepolia deploy + Etherscan verify** (R-01 funds ready); smoke E2E → **M8** | Seed demo data; screenshot every flow for report |
| **28** | `docs/api-reference.md`, README finalization | `docs/deployment-guide.md`; compile test report |
| **29** | Defense Q&A doc (`docs/defense-qa.md`): contract & backend questions | Defense Q&A: architecture & frontend questions; assemble report |
| **30** | **Demo rehearsal** (scripted flow, backup local chain), buffer, final push | Same |

## 5. Milestone acceptance criteria

| M | Criteria |
|---|---|
| M1 | All CT-01…15 pass locally; coverage ≥ 90%; contract reviewed by both students |
| M2 | Login works for all roles; SEC-01/02/13 style checks pass manually |
| M3 | Upload → validate → hash → store → DB record round-trip; tampered file rejected |
| M4 | Issuance confirmed on local chain; tx hash + block recorded; failed tx handled |
| M5 | All 3 verification modes return the 4 result states correctly; QR scans to the right page |
| M6 | Admin/university/student journeys complete in the UI |
| M7 | All SEC tests pass; every result documented expected-vs-actual; findings fixed |
| M8 | Contract on Sepolia, verified on Etherscan; E2E smoke test on testnet passes |
| M9 | 30+ defense questions answered in writing; demo rehearsed end-to-end |

## 6. Mapping to the professor's criteria

| Criterion (points) | Where it is earned |
|---|---|
| **A — Blockchain concepts & design (4)** | `docs/02-architecture.md` §2 (anchoring rationale, alternatives), §7 (on/off-chain table), §14 (honest limitations) — converted into report chapters |
| **B — Contract dev, security & testing (6)** | Phase 2 (Days 4–7) + Phase 8 (24–26): `CertificateRegistry.sol`, CT-01…15, SEC-04…08, coverage report, Etherscan verification |
| **C — Technical Q&A (7)** | Day 29–30 `defense-qa.md`; the pair-review habit; the rule *you may not ship code you cannot explain* |
| **D — Generative AI usage (3)** | `docs/07-ai-usage-log.md` maintained from Day 1; verification protocol; documented corrections |

## 7. Scope management

**Cut list (in order, if time runs short):** ClamAV stretch → activity-log filters → student portal polish → dark mode/animation. **Never cut:** contract tests, security tests, verification flows, documentation, defense prep.

**Add list (only if M1–M8 done early):** Slither static analysis; GitHub Actions CI; contract event indexer; Etherscan read-only verification widget.

## 8. Definition of Done (every task)

1. Code committed with a conventional-commit message and pushed.
2. Partner reviewed/approved.
3. Tests written **and run** (never report unrun tests as passing — brief rule 6).
4. `docs/` updated if behavior/design changed.
5. AI log entry added if AI assisted (criterion D).

## 9. Demo-day plan (draft, refined in Phase 10)

1. Landing page → public verification of a **valid** diploma (QR scan with phone).
2. Tamper with the PDF (one byte) → verification says **invalid/modified**.
3. University issues a new diploma live → show tx on **Etherscan**.
4. University revokes → verification says **revoked**.
5. Admin deauthorizes a university → issuance attempt fails.
6. Close with the trust model: "even if our servers disappear, the anchors remain verifiable on Sepolia."
