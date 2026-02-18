# Truth Core — Step 4 (Policy-Gated Promotion)

This step introduces a security gate for promoting conflict-aware truth lines in sensitive domains.

## Added

- `src/lib/truth/promotion.ts`
  - `promoteTruthWithPolicy({ scope, claimKey, user })`
  - applies RBAC check before promotion
  - resolves truth snapshot for claim key
  - when claim is in sensitive domains and has conflicts, requires HITL approval

Sensitive-domain matcher currently checks claim keys for:
- payroll
- finance
- legal
- security
- compliance

## Test coverage

- `src/test/truth_promotion_setup.ts`
  - verifies sensitive conflict promotion requires HITL and can be approved with nonce
  - verifies VIEWER cannot promote truth in admin scope (RBAC deny)

## Script wiring

- Added `npm run test:truth-promotion`
- Included in `test:unit`

## Security posture

- Promotion path is now explicit RBAC + HITL aware
- Conflict metadata is preserved and not suppressed
- Sets foundation for future HITL-required UI actions (mind map "promote to truth")
