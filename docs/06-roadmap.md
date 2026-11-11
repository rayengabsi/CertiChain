# CertiChain — Emergency Development Plan

| | |
|---|---|
| **Version** | **2.0** (2026-11-11) — replaces the cancelled 30-day roadmap v1.0 |
| **Deadline** | Functional, demonstrable MVP **tonight** |
| **Team** | Two students + AI pair (all code AI-assisted → student verification protocol applies, criterion D) |

## Confirmed technical decisions (locked)

1. JavaScript everywhere (frontend, backend, contract tests).
2. Local MongoDB: `mongodb://127.0.0.1:27017/certichain` (service verified running).
3. JWT stored in `sessionStorage` (documented XSS trade-off in `docs/04-security.md`).
4. Student accounts and activation codes **postponed** (post-MVP backlog).
5. One PDF = one certificate (unique index on SHA-256).
6. Hardhat local chain first (chainId 31337); Sepolia optional after the local demo works.
7. No Docker, no Atlas, no IPFS. PDFs in a protected local `uploads/` directory.
8. **MetaMask university wallets sign all issuance/revocation transactions; the backend holds zero private keys** and verifies frontend-claimed transactions on-chain.

## Tonight's phases (each phase = implementation → test → commit → push)

| # | Phase | Exit criteria | Status |
|---|---|---|---|
| 1 | Documentation updated to emergency scope | this commit | ✅ done (`0bed8ee`) |
| 2 | `blockchain/` workspace: `CertificateRegistry.sol` + full test suite | all CT tests pass locally | ✅ 23/23 passing, 100 % stmts (`fc0c478`) |
| 3 | Local Hardhat node running + contract deployed + ABI exported | contract address recorded in `.env` | ✅ `0x5FbDB2315678afecb367f032d93F642f64180aa3` |
| 4 | `backend/` workspace: Express API + MongoDB + auth/RBAC/upload/hash services | server boots, connects to Mongo, health check green | ✅ (`7dc24e7`) |
| 5 | Public verification + confirm-with-on-chain-verification endpoints | E2E script proves valid/revoked/tampered(not-found) flows | ✅ E2E ALL CHECKS PASSED |
| 6 | `frontend/` workspace: React dashboards + public verification page + MetaMask | production build succeeds; UI wired to API | ✅ build OK, verified in browser (`894dd5f`) |
| 7 | QR generation | QR displayed in dashboard, encodes verification URL | ✅ |
| 8 | Security test suite executed + results documented | `docs/test-report.md` filled with actual results | ✅ 23 backend tests + E2E |
| 9 | README + final documentation + AI log | repo tells the whole story by itself | ✅ |

## Post-MVP backlog (only after tonight's MVP is verified)

Sepolia deployment · student portal with activation codes · Etherscan-verified contract on testnet · rate-limit tuning · pagination · ClamAV scanning · Slither static analysis.

## Demo script for tonight (also the defense demo)

1. Admin logs in → creates university (name + wallet address) → authorizes on-chain with MetaMask.
2. University logs in → uploads diploma PDF → signs issuance with MetaMask → QR appears.
3. Phone scans QR → public page shows **VALID**.
4. Same page after tampering one byte of the PDF → **NOT FOUND** (never VALID — SHA-256 avalanche; see `docs/test-report.md` D-1).
5. University revokes with MetaMask → page shows **REVOKED**.
6. Deauthorized university tries to issue → contract rejects (`AccessControlUnauthorizedAccount`).
7. Closing argument: even with our servers offline, the anchors remain verifiable on-chain.
