import { exportLatestTruthAsJson, getLatestTruthSnapshotForClaimKey } from '../lib/truth/query';

async function main() {
    const scope = process.argv[2] ?? 'GLOBAL';
    const claimKey = process.argv[3];

    if (claimKey) {
        const snapshot = await getLatestTruthSnapshotForClaimKey(scope, claimKey);
        console.log(JSON.stringify({ scope, claimKey, snapshot }, null, 2));
        return;
    }

    const json = await exportLatestTruthAsJson(scope);
    console.log(json);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
