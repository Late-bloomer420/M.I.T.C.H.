# Truth Core — Step 6 (Mind-Map-Ready Graph Export)

This step adds the first graph export surface for a visual drag/drop mind map UI.

## Added

- `src/lib/truth/graph.ts`
  - `buildTruthGraph(scope)`
  - emits graph JSON with:
    - `nodes`: entity / claim / truth
    - `edges`: supports / conflicts_with / about
  - includes provenance metadata on claim nodes

- `src/cli/truth_graph_cli.ts`
  - `npm run truth:graph -- <scope>`
  - prints graph JSON for immediate UI prototyping

- `src/test/truth_graph_setup.ts`
  - validates graph is non-empty after ingest+resolve
  - validates presence of support edges and conflict edges

## Script wiring

- Added `npm run test:truth-graph`
- Included in `test:unit`
- Added `npm run truth:graph`

## Why this matters

This gives a stable, text-first backend format for the future visual mind map:
- drag/drop inputs can feed claims
- claims resolve into snapshots
- UI can render graph with provenance + conflicts
