# TASKLIST — Open Implementations

_Last updated: 2026-02-18_

## P0 — Core correctness & safety

- [ ] **Wire full test runner**
  - [ ] Add npm scripts for all setup/integration checks in `src/test/*_setup.ts`
  - [ ] Add a single `npm run test:all` command
  - [ ] Ensure all tests pass from fresh clone

- [ ] **HITL enforcement in user-facing flow**
  - [ ] Verify `src/lib/validation/advanced_hitl.ts` is invoked by CLI + Electron action paths
  - [ ] Block privileged actions when HITL policy requires approval
  - [ ] Add regression tests for deny/allow branches

- [ ] **RBAC gate coverage**
  - [ ] Confirm `src/lib/security/rbac_policy.ts` wraps sensitive operations
  - [ ] Add tests for role escalation attempts
  - [ ] Add default-deny behavior test

- [ ] **Audit integrity checks**
  - [ ] Ensure all sensitive operations emit entries through `src/lib/security/audit_ledger.ts`
  - [ ] Add tamper-evidence verification test
  - [ ] Define retention/rotation strategy for audit artifacts

## P1 — Product integration

- [ ] **Electron app flow completion**
  - [ ] Complete IPC contract between `main.ts`, `preload.ts`, and `renderer.ts`
  - [ ] Add error-to-UI propagation
  - [ ] Add smoke test for startup + first action

- [ ] **CLI parity with Electron**
  - [ ] Align command capabilities in `src/cli/mitch_chat.ts`
  - [ ] Reuse shared services for policy, masking, and audit
  - [ ] Add CLI e2e script for typical operator flow

- [ ] **Masker service hardening**
  - [ ] Replace placeholder metadata value `"TODO"` in `src/services/masker/main.py`
  - [ ] Add explicit mapping to identity map IDs
  - [ ] Add failure/retry behavior for masker requests

- [ ] **Streaming demasker robustness**
  - [ ] Validate chunk boundary handling in `src/lib/streaming/demasker.ts`
  - [ ] Add adversarial tests (partial tokens, malformed sequences)
  - [ ] Define backpressure and timeout behavior

## P2 — Data & platform

- [ ] **DB lifecycle**
  - [ ] Validate current Drizzle migrations against runtime schema
  - [ ] Add migration sanity command + docs
  - [ ] Add backup/restore notes for local SQLite

- [ ] **Sandbox runtime policy**
  - [ ] Finalize `src/lib/sandbox/manifest.ts` constraints
  - [ ] Add explicit deny list tests in `src/lib/sandbox/runtime.ts`
  - [ ] Document expected runtime permissions

- [ ] **Crypto/token module review**
  - [ ] Review token lifecycle in `src/lib/crypto/token.ts`
  - [ ] Add expiry/revocation tests
  - [ ] Validate key handling boundaries

## P3 — DevEx & governance

- [ ] **CI pipeline**
  - [ ] Add GitHub Actions workflow for install + lint + test:all
  - [ ] Add artifact upload for logs on failure

- [ ] **Documentation**
  - [ ] Expand README with architecture diagram and threat model summary
  - [ ] Add `docs/` with module-level design notes
  - [ ] Add contributor setup + coding standards

- [ ] **Branch/release hygiene**
  - [ ] Protect `main` branch
  - [ ] Define semantic versioning + changelog process
  - [ ] Add release checklist

---

## Quick next 5 (recommended order)

1. [ ] Add `test:all` and make all setup tests runnable in one command.
2. [ ] Complete Electron IPC + policy gate wiring.
3. [ ] Implement non-placeholder identity map linkage in masker metadata.
4. [ ] Add audit coverage tests for all privileged actions.
5. [ ] Add CI workflow to enforce test pass on PRs.
