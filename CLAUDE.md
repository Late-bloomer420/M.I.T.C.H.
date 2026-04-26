# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

M.I.T.C.H. (Multi-agent Identity & Trusted Channel Hub) is a local security layer and orchestration core for multi-agent AI systems. Its core concerns are: context-scoped PII tokenization, RBAC policy enforcement, human-in-the-loop (HITL) approval gates, tamper-evident audit logging, and a multi-source "Truth Core" that ingests claims and promotes a single canonical line of truth.

**Stack:** TypeScript (strict, ES2022/NodeNext), Node.js, SQLite + Drizzle ORM, Electron (desktop UI), FastAPI (Python masker microservice at `src/services/masker/`). TypeScript is run directly via `tsx` — there is no compile step.

---

## Commands

```bash
# Database
npm run db:generate    # Generate Drizzle migrations from schema changes
npm run db:migrate     # Apply migrations to sqlite.db

# Test suites
npm run test:unit          # prepare → reset → all truth/token/stream tests
npm run test:integration   # prepare → reset → audit/hitl/intent/rag/rbac/sandbox
npm run test:demo          # electron, chat simulation, final loop
npm run test:all           # unit + integration + demo

# Run a single test
npm run test:token         # example — each module has its own npm script
# Full list: test:audit, test:hitl, test:intent, test:rag, test:rbac, test:sandbox,
#            test:stream, test:token, test:tpm, test:truth-ingest, test:truth-resolver,
#            test:truth-promotion, test:truth-query, test:truth-graph, test:truth-import,
#            test:context-core, test:electron, test:chat, test:final

# Reset mutable state before integration tests (required for determinism)
npm run test:reset

# Servers / CLI
npm run context-core:start    # Context-core HTTP server on port 4321
npm run ui:workspace:server   # Workspace UI server on port 4317
npm run truth:show            # CLI: display truth data
npm run truth:graph           # CLI: visualize truth graph
npm run truth:import          # CLI: import claims
```

There are no lint or format scripts configured.

---

## Architecture

### Security Layers (applied concentrically)

1. **Sanitization** — Unicode NFKC normalization, invisible char stripping, emoji tokenization (`src/lib/crypto.ts`, Python masker)
2. **PII Masking** — `IdentityVault` tokenizes real values into context-scoped tokens stored in the `identity_map` DB table. The same person gets a different token in `GLOBAL` vs `FINANCE` context (`src/lib/pii/mapper.ts`)
3. **RBAC** — Role × Resource × Action matrix (roles: ADMIN/EDITOR/VIEWER; resources: CONTEXT/TOOL/SYSTEM) enforced at every sensitive call site (`src/lib/security/rbac_policy.ts`)
4. **HITL** — High-risk actions enter an approval queue with nonce-based intent binding to prevent replay attacks (`src/lib/validation/hitl.ts`, `advanced_hitl.ts`)
5. **Audit Ledger** — Every sensitive operation appended with chain-of-hash verification to `./audit.ledger` (`src/lib/security/audit_ledger.ts`)
6. **Kill-Switch** — Global lock triggered on panic; blocks all operations until unlocked (`src/lib/security/killswitch.ts`)

### Truth Core

The `src/lib/truth/` subsystem manages multi-source claim ingestion and conflict resolution:

- **Ingest** (`ingest.ts`): Parses raw text/conversations into `(subject, predicate, object)` triples → stored in the `claims` DB table
- **Resolver** (`resolver.ts`): Detects conflicts between claims, scores confidence, generates snapshots
- **Promotion** (`promotion.ts`): HITL-gated flow to promote an unresolved conflict to canonical single-line-of-truth
- **Query** (`query.ts`): `getLatestTruthSnapshot()` returns the current canonical truth + supporting claims
- **Graph** (`graph.ts`): Visualizes claim relationships

### Electron (Trusted Zone Pattern)

- **Main process** (`src/electron/main.ts`) — Trusted Zone: holds encryption keys, DB access, kill-switch
- **Renderer** (`src/electron/renderer/renderer.ts`) — Untrusted Zone: sandboxed browser window
- **Preload** (`src/electron/preload.ts`) — Context-isolation bridge; only surfaces declared IPC channels
- **IPC contract** (`src/electron/ipc.ts`) — Typed channel definitions: `terminal-input`, `terminal-output`, `terminal-error`, `system-lock`

### Context-Core

`src/context-core/` stores chat turns from multiple providers (openclaw, chatgpt, gemini, manual), tracks focus tags (important/watch/ignore/verify), and builds a `FeedbackPack` (stable truths, key deltas, unresolved conflicts, focus anchors) served at `GET /api/context/feedback-pack`.

### Masker Microservice

`src/services/masker/main.py` — FastAPI on port 8000. Implements a double-blind pipeline: mask input → embed → store in ChromaDB. Used for push-only RAG: mask query → vector search → return masked results. Start separately from the Node.js services.

### Database

Schema is defined in `src/db/schema.ts` (Drizzle). Key tables: `piiTypes`, `identityMap`, `dataMappings`, `claims`, `truthSnapshots`, `contextTurns`, `focusTags`. Unique constraints enforce context-scoped identity (content_hash + context_prefix) and idempotent chat-turn ingestion.

---

## Key Conventions

- **No build step** — `tsx` executes TypeScript directly. All test and CLI scripts use `node ./node_modules/tsx/dist/cli.mjs <file>`.
- **Test determinism** — Always run `npm run test:reset` before integration tests. Reset: unlocks KillSwitch, clears mutable DB tables, clears pending HITL requests, removes `audit.ledger`.
- **Environment variables** — `ENCRYPTION_KEY` and `TOKEN_SECRET` default to hardcoded development values if unset. Never commit real values; both are listed in `.gitignore` via `.env.*`.
- **State files** — `sqlite.db` and `audit.ledger` are gitignored runtime artifacts. Do not commit them.
- **Context scoping** — PII tokens are always created with an explicit context prefix. Cross-context token reuse is a security violation.
- **HITL nonces** — Each high-risk action binds a single-use nonce. Reusing a nonce is rejected as a replay attack.

---

## Docs

- `docs/TRUTH_CORE_STEP*.md` — 7-step architectural progression of the Truth Core
- `docs/TESTING.md` — Test suite map and failure triage guide
- `TASKLIST.md` — Prioritized open items (P0–P3) and vision notes
- `CHANGELOG.md` — Feature history with dates
- `RESUME.md` — Latest development checkpoint
