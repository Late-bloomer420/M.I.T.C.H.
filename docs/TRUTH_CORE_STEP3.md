# Truth Core — Step 3 (Conflict-Aware Resolver v1)

This step adds the first resolver that converts ingested claims into a persisted `single_line_of_truth` snapshot.

## Added

- `src/lib/truth/resolver.ts`
  - `resolveTruthForClaimKey({ claimKey, scope, generatedBy })`
  - selects active claims for a key
  - picks winner by confidence, then recency
  - records conflicts when competing object values exist
  - writes `truth_snapshots` record

- `src/test/truth_resolver_setup.ts`
  - seeds conflicting claims (`Alice is CEO` vs `Alice is CTO`)
  - forces deterministic winner via confidence
  - verifies:
    - single-line winner
    - conflicts metadata exists
    - snapshot persistence

## Script wiring

- Added `npm run test:truth-resolver`
- Included in `test:unit`

## Security posture

- Resolver does not bypass policy gates
- Conflicts are retained (not silently discarded)
- Next step can enforce HITL for conflict promotion in sensitive domains
