# CertiChain

**Blockchain-anchored diploma issuance and verification platform.**

CertiChain allows authorized universities to issue digital diplomas whose **SHA-256 cryptographic fingerprints** are anchored on a public Ethereum-compatible blockchain (Sepolia testnet). Recruiters and companies can verify the authenticity of any diploma in seconds — by certificate ID, by uploading the PDF, or by scanning a QR code — without registering and without trusting CertiChain's servers: the blockchain record is the source of truth.

The original diploma (PDF) is stored **off-chain**; only a non-identifying certificate reference and its cryptographic hash are recorded **on-chain**.

---

## Key capabilities

| Capability | Description |
|---|---|
| Certificate issuance | Authorized university uploads a diploma PDF; the system computes SHA-256 of the exact file bytes and registers the fingerprint on-chain. |
| Certificate verification | Public verification by certificate ID, PDF upload (hash comparison), or QR code. |
| Certificate revocation | Issuing university can revoke a certificate it issued (e.g., fraud discovered, administrative error). |
| University authorization | Platform admin grants/revokes on-chain issuer rights per university. |
| Immutable history | All issuances, revocations and authorization changes are emitted as blockchain events — a tamper-evident audit trail. |
| Transaction references | Every result links to the Sepolia block explorer for independent verification. |

## User roles

| Role | Capabilities |
|---|---|
| **Admin** | Authorize/deauthorize universities, view system activity (audit logs). |
| **University** | Upload diploma PDFs, enter certificate information, issue certificates, view issued certificates, revoke own certificates. |
| **Student** | View their certificates, download their diplomas, share certificate links and QR codes. |
| **Recruiter** | Verify certificates **without registration** — by certificate ID, by PDF upload, or via QR code. |

## Technology stack

| Layer | Technology |
|---|---|
| Frontend | React.js, Vite, JavaScript, Tailwind CSS |
| Backend | Node.js, Express.js, MongoDB (Mongoose), JWT, bcrypt |
| Blockchain | Solidity, Hardhat, OpenZeppelin AccessControl, ethers.js, Sepolia testnet, MetaMask |
| Cryptography | SHA-256 (Node.js `crypto` module) |
| Tooling | Git/GitHub, ESLint, Jest + Supertest, Chai/Mocha (Hardhat) |

## Repository layout

```
CertiChain/
├── docs/          # Planning, architecture, security and roadmap documentation
├── blockchain/    # Hardhat workspace — CertificateRegistry.sol, tests, deploy scripts
├── backend/       # Node.js + Express REST API, MongoDB models, blockchain service
└── frontend/      # React + Vite SPA
```

> The `blockchain/`, `backend/` and `frontend/` workspaces will be scaffolded in **Phase 1**, after the planning documents below are approved.

## Documentation index

| Document | Contents |
|---|---|
| [docs/01-requirements.md](docs/01-requirements.md) | Scope, actors, use cases, functional & non-functional requirements |
| [docs/02-architecture.md](docs/02-architecture.md) | System architecture, design decisions, on-chain/off-chain model, data flows |
| [docs/03-folder-structure.md](docs/03-folder-structure.md) | Detailed monorepo folder structure and conventions |
| [docs/04-security.md](docs/04-security.md) | Threat model, security requirements, vulnerability analysis, security test plan |
| [docs/05-risks.md](docs/05-risks.md) | Technical risk register with mitigations and contingencies |
| [docs/06-roadmap.md](docs/06-roadmap.md) | 30-day development plan for a two-student team |
| [docs/07-ai-usage-log.md](docs/07-ai-usage-log.md) | Generative-AI usage record and verification protocol (evaluation criterion D) |

## Project status

**Phase 0 — Planning (complete).** Architecture, requirements, security analysis and roadmap are documented and awaiting team review. Implementation starts in Phase 1 (repository scaffolding) after approval.

## Academic context

Final-year university project (Blockchain & Cybersecurity), developed by a team of two students over 30 days. The project is evaluated on: (A) blockchain concepts and solution design, (B) smart contract development, security and testing, (C) technical questions and answers, (D) responsible generative-AI usage.
