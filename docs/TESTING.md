# Testing Guide

## Suites

- `npm run test:unit`
  - fast logic checks (setup/token/stream/tpm)
- `npm run test:integration`
  - stateful and policy flow checks (reset/audit/hitl/intent/rag/rbac/sandbox)
- `npm run test:demo`
  - user-facing flow simulations (electron/chat/final)
- `npm run test:all`
  - runs unit + integration + demo

## Determinism

`test:integration` begins with `test:reset`, which:
- unlocks KillSwitch with admin key
- clears mutable DB tables
- clears pending HITL requests
- removes stale `audit.ledger`

## Common failure triage

### "Run integration suite" failed in CI
1. Check `integration-artifacts` download from workflow run.
2. Reproduce locally:
   - `npm ci`
   - `npm run test:integration`
3. If local pass but CI fail:
   - re-run failed job once (transient env issue)
   - inspect exact failing sub-step in logs

### HITL failures
- Verify approval request nonce is passed back correctly.
- Confirm test is not attempting to approve with stale request id.

### RBAC failures
- Validate action/resource pair is part of permission matrix.
- Default-deny for unsupported combinations is expected.
