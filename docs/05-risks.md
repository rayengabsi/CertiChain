# CertiChain — Technical Risk Register

| | |
|---|---|
| **Phase** | 0 — Planning |
| **Version** | 1.0 (2026-11-11) |
| **Status** | Living document — reviewed at every milestone |

Probability & impact scored **Low / Medium / High**. Owner: **A** = student A (blockchain/backend lead), **B** = student B (frontend/integration lead), **T** = both.

| ID | Risk | P | I | Mitigation (do now) | Contingency (if it happens) | Owner |
|---|---|---|---|---|---|---|
| R-01 | Sepolia test ETH unavailable / faucet limits | M | H | Acquire test ETH for 2–3 wallets **by Day 10** (before it is needed on Day 27); use multiple faucet providers; keep ≥0.5 ETH total | Demo on Hardhat local node with saved state; show Sepolia deployment video as backup | T |
| R-02 | MongoDB not installed locally (confirmed) | H | M | Create Atlas free cluster on Day 2; store URI in `.env` | Local MongoDB install; or `mongodb-memory-server` for tests | A |
| R-03 | Contract bug discovered after Sepolia deployment | L | H | Test-first contract phase (Days 4–7), ≥90% coverage, code review by partner before deploy | Redeploy + re-authorize universities (documented recovery path, no funds at risk) | T |
| R-04 | Nonce collisions / stuck transactions under concurrent issuance | M | M | Per-wallet serialized tx queue; sync nonce from `getTransactionCount('pending')` on start | Bump gas and replace stuck tx; single-flight issuance during demo | A |
| R-05 | PDF hash mismatch caused by storage re-encoding | M | H | Hash **exact uploaded bytes**; store the same bytes untouched; never re-serialize; test the round-trip early (Day 13) | If detected late: re-anchor with corrected pipeline before demo | A |
| R-06 | MetaMask/wallet issues during demo | M | M | Wallets not in the critical demo path (backend signs); MetaMask only for deployment/emergency | Pre-recorded backup video; pre-authorized university wallets | T |
| R-07 | Scope creep (student portal, IPFS, extra features) | H | H | MVP scope frozen in `docs/01-requirements.md` §3.2; brief rule 13; every addition requires team approval | Cut-list discipline (roadmap §7) | T |
| R-08 | Time overrun (course load, exams) | M | H | Buffer day (Day 30); milestones with acceptance criteria; weekly re-planning | Cut from stretch list: ClamAV, activity-log filters, student portal polish — never core verification | T |
| R-09 | AI-generated code defects / misunderstanding our own code | M | H | AI usage protocol: review → test → explain every block (rule 6/7 + criterion C/D); partner cross-review | Roll back via Git; rewrite the component manually | T |
| R-10 | JWT secret or keys accidentally committed | L | H | `.gitignore` from first commit; `.env.example` only; pre-push habit: `git status` check | Rotate secrets immediately; purge history (`git filter-repo`); rotate admin wallet | T |
| R-11 | Dependency vulnerabilities / breaking versions | M | M | Pin exact versions in Phase 1; `npm audit` in Phase 8; minimal dependency set | Patch versions; fall back to last-known-good lockfile | A |
| R-12 | Windows-specific issues (path handling, native modules) | M | L | Use `path.join`; bcrypt has Windows prebuilds (fallback: `bcryptjs`); avoid shell scripts | Use `bcryptjs`; document deviation | T |
| R-13 | Merge conflicts / lost work between two students | M | M | Feature branches + frequent pushes (after every task); partner PR review; conventional commits | `git reflog` recovery; rebase discipline | T |
| R-14 | RPC provider outage (Alchemy) during demo | L | H | Second RPC URL configured; verify endpoint health in smoke test | Switch `RPC_URL` to backup provider (Infura/public); local chain fallback | A |
| R-15 | Demo-day network/venue failure | L | M | Everything runs from one laptop; local Hardhat fallback chain scripted | Airplane-mode demo on local node + recorded Sepolia evidence | T |

## Top-3 immediate actions (before Phase 1)

1. **R-01**: request Sepolia test ETH from at least two faucet providers this week (some require a mainnet-balance check or Google account — do it early).
2. **R-02**: create the MongoDB Atlas cluster and confirm connectivity from both laptops.
3. **R-07/R-08**: both students read and *amend* `docs/01-requirements.md` — the scope freeze only works if you both own it.
