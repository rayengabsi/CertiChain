# CertiChain — Folder Structure Proposal

| | |
|---|---|
| **Phase** | 0 — Planning |
| **Version** | 1.0 (2026-11-11) |
| **Status** | Awaiting approval — nothing below is scaffolded yet (that is Phase 1) |

---

## 1. Why a monorepo

One repository, three independent npm workspaces. For a two-student team this means: one Git history, one clone, one README, atomic cross-layer commits ("issue certificate: contract event + API + UI"), and simple grading/professor access — while each workspace keeps its own `package.json`, dependencies and test runner.

## 2. Full structure (annotated)

```
CertiChain/
├── README.md                        # Project overview + documentation index
├── .gitignore                       # Never commit: node_modules, .env, uploads, keys, coverage
├── .gitattributes                   # Line-ending + binary normalization (Windows-friendly)
│
├── docs/                            # ← Phase 0 planning (already exists)
│   ├── 01-requirements.md
│   ├── 02-architecture.md
│   ├── 03-folder-structure.md       # This file
│   ├── 04-security.md
│   ├── 05-risks.md
│   ├── 06-roadmap.md
│   ├── 07-ai-usage-log.md
│   ├── api-reference.md             # Phase 10: full endpoint documentation
│   ├── deployment-guide.md          # Phase 9: Sepolia runbook
│   ├── test-report.md               # Phase 8: expected vs actual results (SEC/CT IDs)
│   └── defense-qa.md               # Phase 10: anticipated defense questions + answers
│
├── blockchain/                      # ── Hardhat workspace ─────────────────────────
│   ├── contracts/
│   │   └── CertificateRegistry.sol  # The only production contract (minimal by design)
│   ├── test/
│   │   └── CertificateRegistry.test.js  # CT-01…CT-15 (docs/04-security.md §8)
│   ├── scripts/
│   │   ├── deploy.js                # Deploys to the network in --network flag
│   │   └── grant-issuer.js          # Admin helper: authorize a university address
│   ├── hardhat.config.js            # Networks (localhost + sepolia), solidity 0.8.24,
│   │                                #   etherscan API key for source verification
│   ├── .env.example                 # SEPOLIA_RPC_URL, DEPLOYER_PRIVATE_KEY, ETHERSCAN_API_KEY
│   └── package.json                 # hardhat, @openzeppelin/contracts, toolbox
│
├── backend/                         # ── Node.js + Express API ────────────────────
│   ├── src/
│   │   ├── server.js                # Entry: listens on PORT (never imported by tests)
│   │   ├── app.js                   # Express app wiring only (importable by supertest)
│   │   ├── config/
│   │   │   ├── env.js               # Loads + validates every env var ONCE, fails fast
│   │   │   ├── db.js                # Mongoose connection + error handling
│   │   │   └── constants.js         # ROLES, file limits, rate-limit numbers
│   │   ├── middleware/
│   │   │   ├── auth.js              # JWT verify → req.user {id, role, universityId}
│   │   │   ├── rbac.js              # requireRole('admin' | 'university' | 'student')
│   │   │   ├── rateLimiter.js        # Global + stricter auth/verify limiters
│   │   │   ├── upload.js            # Multer: memory storage → validation → disk
│   │   │   ├── audit.js             # writeAudit(actor, action, target, result)
│   │   │   ├── validate.js          # express-validator runner → 400 with details
│   │   │   └── errorHandler.js      # Central errors; no stack traces in responses
│   │   ├── models/
│   │   │   ├── User.js              # email, passwordHash, role, activationToken…
│   │   │   ├── University.js        # name, ethAddress, encryptedSignerKey…
│   │   │   ├── Certificate.js       # certificateId, sha256 (unique), status, tx refs
│   │   │   └── AuditLog.js          # append-only
│   │   ├── controllers/            # Thin: call services, shape responses
│   │   │   ├── auth.controller.js
│   │   │   ├── admin.controller.js
│   │   │   ├── certificate.controller.js   # issue, list, detail, revoke
│   │   │   ├── student.controller.js        # list, download, qr
│   │   │   └── verify.controller.js        # PUBLIC: by id, by file
│   │   ├── routes/
│   │   │   ├── auth.routes.js       # /api/auth
│   │   │   ├── admin.routes.js      # /api/admin
│   │   │   ├── certificate.routes.js # /api/certificates
│   │   │   ├── student.routes.js    # /api/student
│   │   │   └── verify.routes.js     # /api/verify (public)
│   │   ├── services/               # All business + blockchain logic lives here
│   │   │   ├── hash.service.js      # SHA-256 over exact bytes (node:crypto)
│   │   │   ├── storage.service.js   # Save/read PDFs (random names, private dir)
│   │   │   ├── blockchain.service.js      # Contract instance, read calls, receipts
│   │   │   ├── issuerWallet.service.js    # Create/encrypt/load university signers
│   │   │   ├── txQueue.service.js   # Per-wallet nonce serialization
│   │   │   ├── qr.service.js        # QR PNG data-URL generation
│   │   │   └── audit.service.js     # Audit write helper (used by middleware)
│   │   ├── validators/
│   │   │   ├── auth.validation.js
│   │   │   ├── certificate.validation.js  # Body + param schemas
│   │   │   └── admin.validation.js
│   │   └── utils/
│   │       ├── ApiError.js          # Typed error: status, code, safe message
│   │       ├── asyncHandler.js      # Wrap async controllers → error middleware
│   │       └── crypto.js            # AES-256-GCM encrypt/decrypt helpers
│   ├── tests/                       # Jest + Supertest (in-process app, test DB)
│   │   ├── auth.security.test.js    # SEC-01, SEC-03, SEC-13
│   │   ├── rbac.security.test.js    # SEC-01, SEC-02, SEC-06
│   │   ├── upload.security.test.js  # SEC-09…SEC-11
│   │   ├── certificate.security.test.js # SEC-05…SEC-08
│   │   ├── verify.security.test.js # SEC-04, SEC-12, SEC-14
│   │   └── helpers/                 # seed data, token factory, fake PDF builder
│   ├── uploads/                     # PDF store — gitignored, never statically served
│   ├── .env.example                 # See §4
│   ├── jest.config.js               # test DB, timeout, coverage thresholds
│   └── package.json
│
└── frontend/                        # ── React + Vite SPA ──────────────────────────
    ├── public/                      # Static assets (logo, favicon)
    ├── src/
    │   ├── main.jsx                 # React root + router + providers
    │   ├── App.jsx                  # Route table (public/protected/role-guarded)
    │   ├── api/
    │   │   └── client.js             # axios instance, Bearer interceptor, error mapping
    │   ├── context/
    │   │   └── AuthContext.jsx      # JWT state (sessionStorage), login/logout
    │   ├── components/
    │   │   ├── layout/              # Navbar, Footer, DashboardShell
    │   │   ├── common/              # Button, Card, Badge, Spinner, EmptyState
    │   │   ├── certificates/        # CertificateTable, IssueForm, RevocationModal
    │   │   └── verification/        # VerifyResultCard (4 states), QrDisplay
    │   ├── pages/
    │   │   ├── Landing.jsx
    │   │   ├── Login.jsx / Register.jsx   # Register = student activation
    │   │   ├── admin/               # Dashboard, Universities, ActivityLog
    │   │   ├── university/          # Dashboard, IssueCertificate, MyCertificates, Detail
    │   │   ├── student/             # MyCertificates, CertificateDetail (+QR, download)
    │   │   └── public/              # Verify.jsx (ID search + PDF upload + QR target)
    │   ├── hooks/                   # useAuth, useApi (loading/error patterns)
    │   └── utils/                   # formatters (dates, tx links), constants
    ├── index.html
    ├── vite.config.js               # Dev proxy → backend :5000
    ├── tailwind.config.js
    ├── .env.example                 # VITE_API_URL
    └── package.json
```

## 3. Conventions

| Topic | Convention |
|---|---|
| File naming | `kebab-case` / `dot.suffix` (`certificate.validation.js`, `CertificateTable.jsx`) |
| JS style | ES modules, `camelCase` vars, `PascalCase` components/models, ESLint (shared config per workspace) |
| Routes → controllers → services | Routes only wire middleware; controllers only orchestrate; **all logic in services** (unit-testable without HTTP) |
| Tests | Contract tests in `blockchain/test`, API/security tests in `backend/tests`, both runnable via `npm test` in each workspace |
| Commits | Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`), one logical change per commit, pushed after every task |
| Branches | `main` stays green; feature work on `feat/<topic>`; partner reviews before merge |
| Env | Every workspace ships `.env.example`; real `.env` is gitignored — **secrets never enter Git** |

## 4. Environment variables (created in Phase 1, values shown are placeholders)

`backend/.env.example`:

```ini
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://localhost:27017/certichain      # or Atlas connection string
JWT_SECRET=CHANGE_ME_64_random_bytes_hex             # node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_EXPIRES_IN=1h
BCRYPT_ROUNDS=12
RPC_URL=http://127.0.0.1:8545                       # Sepolia RPC for the demo deployment
CHAIN_ID=31337
CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
ADMIN_PRIVATE_KEY=0x_change_me                       # Sepolia-funded admin wallet
MASTER_ENCRYPTION_KEY=CHANGE_ME_32_bytes_hex         # AES-256-GCM key for signer keys
FRONTEND_ORIGIN=http://localhost:5173
PUBLIC_BASE_URL=http://localhost:5173               # used to build QR verification links
MAX_UPLOAD_BYTES=10485760                            # 10 MB
```

`blockchain/.env.example`:

```ini
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
DEPLOYER_PRIVATE_KEY=0x_change_me
ETHERSCAN_API_KEY=YOUR_KEY
```

`frontend/.env.example`:

```ini
VITE_API_URL=http://localhost:5000
```

## 5. What deliberately does NOT exist

| Not present | Reason |
|---|---|
| `blockchain/deployments/` artifacts | Deployments are reproducible from scripts; addresses live in backend env |
| Microservices / extra gateways | Brief forbids unnecessary technology |
| Docker files | Docker not installed on the dev machines; adds scope without grading value |
| `contracts/` beyond the registry | One minimal contract is a *feature* (attack surface, gas, review effort) |
