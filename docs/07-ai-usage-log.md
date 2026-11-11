# CertiChain — Generative AI Usage Log

| | |
|---|---|
| **Purpose** | Evaluation criterion D (3 points) — documented, responsible AI usage |
| **Policy version** | 1.0 (2026-11-11) |

---

## 1. Why this log exists

The project brief and the professor's criterion D require transparent records of how generative AI was used, what it produced, and how the team **verified and corrected** it. This log is the single source of truth for that record. Every AI-assisted task gets an entry — including this planning phase.

## 2. AI usage policy (agreed by the team)

**Allowed:** architecture proposals, code drafts, test scaffolding, explanations of concepts, documentation drafting, review checklists.

**Never allowed:** entering real secrets/keys into prompts; accepting code the team does not understand; claiming AI-written tests passed without running them; using AI during the oral defense to answer live questions.

**Verification protocol (every AI output):**

1. **Understand** — both students can explain what the code/document does line by line.
2. **Review** — read the full diff; check against OWASP/requirements; look for subtle bugs (AI-generated code is untrusted input).
3. **Test** — run it; write/extend tests; never report unrun tests as passing.
4. **Correct** — record deviations, simplifications and fixes made to the AI output in this log.
5. **Commit** — conventional commit referencing the AI entry (e.g., `feat: auth endpoints (AI-003, reviewed & corrected)`).

## 3. Entry format

| Field | Description |
|---|---|
| ID | `AI-NNN` (sequential) |
| Date | YYYY-MM-DD |
| Phase / task | What we were building |
| Tool | Model/assistant used |
| Prompt summary | What we asked for (1–2 lines) |
| AI output | What it produced |
| Verification performed | Review + tests + line-by-line understanding |
| Corrections & improvements | What we changed and why (the most important column) |
| Decision | Accepted as-is / accepted with corrections / rejected |

## 4. Log

| ID | Date | Phase / Task | Tool | Prompt summary | AI output | Verification performed | Corrections & improvements | Decision |
|---|---|---|---|---|---|---|---|---|
| AI-001 | 2026-11-11 | Phase 0 — repository inspection, requirements analysis, architecture, folder structure, security analysis, risk register, 30-day roadmap, this log | OpenCode (Big Pickle model) | Full planning package for CertiChain per the project brief (inspect repo → propose architecture/structure/roadmap/security before coding) | 8 planning documents: README, .gitignore/.gitattributes, docs 01–07 | **PENDING — team must:** (1) read every document end-to-end, (2) validate each requirement/decision against the official brief, (3) resolve open decisions D1–D5, (4) record every correction below, (5) confirm approval before Phase 1 | _To be filled by the team_ | Pending review |
| AI-002 | 2026-11-11 | Emergency scope change — documentation updated (architecture v2.0 MetaMask model, emergency roadmap v2.0, requirements/security v1.1) | OpenCode (Big Pickle model) | Update all docs to the emergency deadline decisions (MetaMask wallets, local Mongo, student features postponed) | Rewritten `docs/02-architecture.md` + `docs/06-roadmap.md`; targeted edits in 01/04/05 | Team must review: is the MetaMask + on-chain-verification trust model correctly described? | _To be filled by the team_ | Pending review |
| AI-003 | 2026-11-11 | Full MVP implementation — blockchain workspace (contract + tests), backend (Express API + Mongo + auth/RBAC/upload/hash/verify), frontend (React + MetaMask), E2E demo script, security tests | OpenCode (Big Pickle model) | Implement the complete working MVP tonight per the emergency scope | All source code in `blockchain/`, `backend/`, `frontend/`, `scripts/` (see commits) | **Team must (criterion D & C):** run every test suite themselves (`npm test` in `blockchain/` and `backend/`), run `node scripts/e2e-demo.js`, click through the UI, review each source file, record corrections here — especially any code they cannot yet explain | _To be filled by the team_ | Pending review |
| AI-004 | 2026-11-11 | Frontend dashboards (admin + university + certificate detail) + in-browser verification of the whole stack | OpenCode (Big Pickle model) | Complete the React SPA and make it demonstrable tonight | `frontend/src/pages/**`, `components/**`, `web3/contract.js`, `auth/AuthContext.jsx` | Ran the production build; drove the real UI in a browser (login as admin and as university; opened the public verify page). **Three real bugs were found and fixed:** (1) `parseTransaction` dropped all named event args — ethers v6 exposes them as **non-enumerable**; rewritten to read `e.fragment.inputs`. (2) back-to-back transactions reused a nonce — ethers v6 caches `eth_getTransactionCount` for ~250 ms; fixed with `ethers.NonceManager` and `staticCall` for the enforcement check. (3) after login the university dashboard showed no name/authorization until a manual refresh — `AuthProvider` does not remount on navigation; fixed by calling `refreshMe()` inside `login()` | The E2E script's step-8 assertion also had a **test bug** (an invalid `bytes32` literal, so the contract call reverted before reaching the contract) — corrected to `ethers.hexlify(ethers.randomBytes(32))` + `staticCall`. All fixes are described in `docs/test-report.md`. | Accepted with corrections |
| AI-005 | 2026-11-11 | `docs/test-report.md` (executed results), README rewrite (run instructions), roadmap status, this log | OpenCode (Big Pickle model) | Document the actual executed results honestly, with commands and expected-vs-actual | Test report, updated README, roadmap, AI log | Re-ran **all** suites to capture fresh output before writing the report (contract 23, backend 23, E2E all-pass, frontend build). Deviations D-1..D-4 recorded instead of hidden. | _To be filled by the team_ | Pending review |

> **Team action for AI-001:** do not just approve — *edit*. Correct anything that contradicts your professor's brief or your own understanding, and write the corrections into the row above. A log that shows substantive corrections is worth more than a log that shows blind acceptance (that is precisely what criterion D rewards).

## 5. How to add future entries

1. Append a row (never edit past entries after commit — corrections go in the "Corrections" column or a follow-up entry).
2. Reference the ID in commit messages.
3. Before each milestone review, re-read the log and pick 2–3 entries for the report's AI-usage chapter, showing: prompt → output → verification → correction.
4. Keep the "Corrections & improvements" column honest: "none" should be rare and justified; typical corrections include simplifications, renamed identifiers, removed over-engineering, fixed edge cases, security hardening added on top.
