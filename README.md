# CertiChain

**Blockchain-anchored diploma issuance and verification platform.**

CertiChain lets authorized universities issue digital diplomas whose **SHA-256 fingerprints** are anchored on an Ethereum-compatible blockchain. Anyone — a recruiter, another university, an employer — can verify a diploma in seconds by **certificate ID**, by **uploading the PDF**, or by **scanning a QR code**, without registering and without trusting CertiChain's servers: **the blockchain record is the source of truth**.

The diploma PDF itself is stored **off-chain** (student PII never leaves the backend); only a non-identifying certificate ID, its document hash, the issuer wallet and a timestamp are written **on-chain**.

> **Scope (2026-11-11):** this is the **emergency MVP** — fully functional and demonstrable on a **local Hardhat chain (chainId 31337)**. Sepolia deployment and a student portal are on the post-MVP backlog (see `docs/06-roadmap.md`).

---

## Key capabilities

| Capability | Description |
|---|---|
| Certificate issuance | An authorized university uploads a diploma PDF; the **backend** computes SHA-256 of the exact bytes; the **university's MetaMask wallet** anchors the fingerprint on-chain. |
| Public verification | By certificate ID, by PDF upload (hash comparison), or by QR code — no account required. |
| Certificate revocation | The issuing university revokes with MetaMask; verification then reports REVOKED. |
| University authorization | The platform admin grants/revokes on-chain issuer rights, signed from the admin's MetaMask wallet. |
| On-chain enforcement | The smart contract (`ISSUER_ROLE`) rejects any issuance by a non-authorized wallet — even if the API is bypassed. |
| Immutable audit trail | Issuance, revocation and authorization are on-chain events; the backend also keeps an append-only audit log. |
| Zero backend keys | The backend holds **no private keys** and has read-only chain access. Every chain write is signed in MetaMask. |

## Security model in one paragraph

University and admin wallets live in **MetaMask**; the backend never sees a private key. When the frontend claims a transaction succeeded, the backend **re-reads the receipt from the chain** and requires the event name, certificate ID, fingerprint, issuer and `tx.from` to all match before it trusts anything. Student personal data is stored only in MongoDB and is never returned by any public endpoint. PDFs are validated by magic bytes and MIME type, stored under random UUID filenames in a private directory, and their hash is always computed server-side.

## Technology stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 5, JavaScript, react-router-dom 6, custom CSS (no framework) |
| Wallet | MetaMask + ethers.js v6 (browser) |
| Backend | Node.js, Express 4, MongoDB + Mongoose 8, JWT (HS256), bcryptjs, multer, express-validator, express-rate-limit, helmet, qrcode |
| Blockchain | Solidity 0.8.24, Hardhat, OpenZeppelin `AccessControl`, ethers.js v6, local Hardhat node |
| Cryptography | SHA-256 (Node.js `crypto`) |
| Testing | Mocha/Chai + solidity-coverage (contracts), Jest + Supertest (backend), E2E script |

---

## Prerequisites

- **Node.js 20+** and npm
- **MongoDB** running locally on `127.0.0.1:27017` (Community Server or the `mongod` service)
- **MetaMask** browser extension (to sign transactions in the UI)
- Git

## Getting started (local demo)

The full stack runs locally. Start components **in this order**.

### 1. Blockchain — start a local node and deploy the contract

```bash
cd blockchain
npm install
npx hardhat node          # leave this terminal running (RPC http://127.0.0.1:8545, chainId 31337)
```

In a second terminal, deploy to that node:

```bash
cd blockchain
npx hardhat run scripts/deploy.js --network localhost
```

Note the printed contract address. The default deterministic local address is
`0x5FbDB2315678afecb367f032d93F642f64180aa3`.

### 2. Backend — configure, seed, run

```bash
cd backend
npm install
copy .env.example .env    # then edit .env if needed (see below)
npm run seed              # creates the platform admin account
npm start                 # API on http://localhost:5000
```

`backend/.env` must contain (defaults already match the local stack):

```ini
MONGO_URI=mongodb://127.0.0.1:27017/certichain
JWT_SECRET=<64-byte random hex — generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">
RPC_URL=http://127.0.0.1:8545
CHAIN_ID=31337
CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
ADMIN_EMAIL=admin@certichain.local
ADMIN_PASSWORD=CertiChain-Admin-2026!
```

Check it is alive: <http://localhost:5000/api/health> (should report `blockchain.connected: true`).

> **`.env` files are gitignored and must never be committed.**

### 3. Frontend — run the SPA

```bash
cd frontend
npm install
npm run dev               # http://localhost:5173  (proxies /api to the backend)
```

`frontend/.env` (optional — the defaults in code already point at the local stack):

```ini
VITE_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
VITE_CHAIN_ID=31337
VITE_CHAIN_NAME=Hardhat Localhost
```

### 4. MetaMask — import the demo wallets

Import the Hardhat development accounts into MetaMask and add the network:

- **Network:** RPC `http://127.0.0.1:8545`, chainId `31337`, currency ETH.
- **Admin wallet (account #0):** `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
  private key `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
- **University wallet (account #1):** `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`
  private key `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d`

> These are Hardhat's **public, well-known development keys** — local-only, never use them on a real network. The university's wallet address must be the one registered by the admin (it is the on-chain identity that holds `ISSUER_ROLE`).

## Demo walkthrough

1. **Admin:** log in at `/login` (`admin@certichain.local` / `CertiChain-Admin-2026!`) → *Register a university* with the account #1 wallet address → connect the admin wallet → **Authorize** it (MetaMask signature).
2. **University:** log in (`university@demo.local` / `Demo-University-123`) → *Issue a certificate*: fill the student details, upload a PDF → **Upload & hash** → **Sign `issue()` with MetaMask** → a QR code appears.
3. **Verify:** scan the QR (or open the printed URL, or use the landing-page widget / upload the PDF) → **VALID**.
4. **Tamper:** upload the PDF after changing one byte → **NOT FOUND** (never VALID).
5. **Revoke:** open the certificate → **Sign `revoke()` with MetaMask** → public page now shows **REVOKED**.
6. **Enforcement:** deauthorize the university (admin) → any further `issue()` reverts on-chain.

## Running the tests

```bash
# Smart contracts (23 tests) + coverage
cd blockchain
npm test
npm run coverage

# Backend security & lifecycle (23 tests) — uses a separate certichain_test DB
cd backend
npm test

# Full end-to-end demo against the REAL chain + API + DB
#   (requires: mongod running, hardhat node running, contract deployed, backend running)
cd backend
npm run e2e

# Frontend production build
cd frontend
npm run build
```

See [`docs/test-report.md`](docs/test-report.md) for the executed results, deviations and residual risks.

## Repository layout

```
CertiChain/
├── docs/          # Requirements, architecture, security, risks, roadmap, test report, AI log
├── blockchain/    # Hardhat workspace — CertificateRegistry.sol, tests, deploy script
├── backend/       # Express REST API, MongoDB models, blockchain service, tests, E2E script
└── frontend/      # React + Vite SPA (admin & university dashboards, public verification)
```

## API surface (summary)

| Method & path | Auth | Purpose |
|---|---|---|
| `POST /api/auth/login` | public (rate-limited) | Obtain a JWT |
| `GET /api/auth/me` | any | Current identity + linked university |
| `GET/POST /api/admin/universities` | admin | List / create universities |
| `POST /api/admin/universities/:id/confirm-authorization` \| `.../confirm-deauthorization` | admin | Verify an on-chain role change |
| `GET /api/admin/activity` | admin | Audit log |
| `GET/POST /api/certificates` | university | List / upload (multipart `pdf`) |
| `GET /api/certificates/:id` | university | Detail + QR |
| `POST /api/certificates/:id/confirm` | university | Verify an on-chain issuance |
| `POST /api/certificates/:id/revoke` | university | Verify an on-chain revocation |
| `GET /api/verify/:certificateId` | public | Verify by ID |
| `POST /api/verify/file` | public | Verify by PDF (multipart `pdf`) |

## Documentation index

| Document | Contents |
|---|---|
| [docs/01-requirements.md](docs/01-requirements.md) | Scope, actors, use cases, functional & non-functional requirements |
| [docs/02-architecture.md](docs/02-architecture.md) | System architecture, on-chain/off-chain model, data flows, MetaMask signing model |
| [docs/03-folder-structure.md](docs/03-folder-structure.md) | Monorepo folder structure and conventions |
| [docs/04-security.md](docs/04-security.md) | Threat model (STRIDE), OWASP mapping, security requirements, test plan, residual risks |
| [docs/05-risks.md](docs/05-risks.md) | Technical risk register with mitigations |
| [docs/06-roadmap.md](docs/06-roadmap.md) | Emergency development plan and demo script |
| [docs/07-ai-usage-log.md](docs/07-ai-usage-log.md) | Generative-AI usage record and verification protocol (criterion D) |
| [docs/test-report.md](docs/test-report.md) | **Executed** test results, deviations and honest limitations |

## Project status

**Emergency MVP — complete and demonstrable.** Smart contract (23 tests, 100 % statement coverage), backend (23 security/lifecycle tests), an end-to-end demo that passes every check against the real chain, and a React SPA verified in the browser.

## Academic context

Final-year university project (Blockchain & Cybersecurity), developed by a team of two students. Evaluated on: **(A)** blockchain concepts and solution design, **(B)** smart contract development, security and testing, **(C)** technical questions and answers, **(D)** responsible generative-AI usage. The AI usage log and this repository's commit history are part of the evidence.
