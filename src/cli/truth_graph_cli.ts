import { buildTruthGraph } from '../lib/truth/graph';

async function main() {
    const scope = process.argv[2] ?? 'GLOBAL';
    const graph = await buildTruthGraph(scope);
    console.log(JSON.stringify(graph, null, 2));
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
