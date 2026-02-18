# Truth Core — Step 5 (Read Surface: Scope/Key/Export)

This step provides the first query surface for consumers (future mind-map UI, CLI tools, automations).

## Added

- `src/lib/truth/query.ts`
  - `getLatestTruthSnapshot(scope)`
  - `getLatestTruthSnapshotForClaimKey(scope, claimKey)`
  - `exportLatestTruthAsJson(scope)`

- `src/cli/truth_cli.ts`
  - usage: `npm run truth:show -- <scope> [claimKey]`
  - returns latest truth JSON for scope, or scope+key lookup

- `src/test/truth_query_setup.ts`
  - verifies scope lookup
  - verifies key lookup
  - verifies JSON export

## Lookup strategy

- Key-level retrieval is resolved by matching snapshot supporting claim IDs against `claims.claim_key`.
- This avoids destructive schema migration risk while still providing stable scope+key reads.

## Script wiring

- Added `npm run test:truth-query`
- Included in `test:unit`
- Added `npm run truth:show`
