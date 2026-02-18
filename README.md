# M.I.T.C.H.

**Multi-agent Identity & Trusted Channel Hub**

M.I.T.C.H. is a local security layer and orchestration core for multi-agent systems, focused on privacy-preserving identity handling, policy enforcement, auditability, and human-in-the-loop safeguards.

## Current Capabilities

- Context-aware PII/token mapping
- HITL validation hooks
- RBAC policy checks
- Audit ledger primitives
- Sandbox/runtime manifest checks
- Streaming demasker prototype
- CLI + Electron scaffolding

## Project Structure

- `src/cli/` — CLI entrypoints
- `src/electron/` — Electron main/preload/renderer
- `src/lib/` — core security/privacy/runtime modules
- `src/services/masker/` — masking service prototype
- `src/test/` — setup and integration-style checks
- `drizzle/` — DB migrations/snapshots

## Getting Started

```bash
npm install
npm test
```

## Notes

- Default test currently runs `src/test/setup.ts`.
- Full suites:
  - `npm run test:unit`
  - `npm run test:integration`
  - `npm run test:demo`
  - `npm run test:all`
- Resume context is tracked in `RESUME.md`.
- Milestone changes are documented in `CHANGELOG.md`.
