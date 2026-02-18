# Changelog

## 2026-02-18 — Security/Test Hardening Milestone

### Added
- Full suite orchestration with `test:all`
- Explicit suite split:
  - `test:unit`
  - `test:integration`
  - `test:demo`
- Deterministic pre-test reset via `test:reset`
- Typed Electron IPC contract (`src/electron/ipc.ts`)
- CI workflow with split jobs and concurrency cancellation

### Improved
- HITL tests now assert nonce correctness and replay defense behavior
- RBAC tests now include privilege escalation and admin-op checks
- Electron lock UX shows precise kill-switch reason
- Renderer error output includes timestamp context

### CI/Platform
- Switched CI runner to Linux to avoid trailing-dot repo path issues on Windows
- Added artifact upload for integration diagnostics
