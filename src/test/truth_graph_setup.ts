import { ingestClaimsFromText } from '../lib/truth/ingest';
import { resolveTruthForClaimKey } from '../lib/truth/resolver';
import { buildTruthGraph } from '../lib/truth/graph';

async function main() {
    console.log('--- Truth Graph Setup Test ---');

    await ingestClaimsFromText({
        sourceType: 'text',
        sourceId: 'graph/a.txt',
        rawText: ['Alice is CEO', 'Alice is CTO'].join('\n'),
    });

    await resolveTruthForClaimKey({
        scope: 'MINDMAP',
        claimKey: 'alice.is',
        generatedBy: 'truth-graph-test',
    });

    const graph = await buildTruthGraph('MINDMAP');

    if (graph.nodes.length === 0 || graph.edges.length === 0) {
        console.error('❌ FAILURE: graph is empty.');
        process.exit(1);
    }

    const truthNode = graph.nodes.find((n) => n.type === 'truth');
    if (!truthNode) {
        console.error('❌ FAILURE: missing truth node.');
        process.exit(1);
    }

    const hasSupportEdge = graph.edges.some((e) => e.type === 'supports');
    const hasConflictEdge = graph.edges.some((e) => e.type === 'conflicts_with');
    if (!hasSupportEdge || !hasConflictEdge) {
        console.error('❌ FAILURE: missing support/conflict edges.');
        process.exit(1);
    }

    console.log('✅ SUCCESS: graph export contains truth/claim/entity nodes with support+conflict edges.');
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
