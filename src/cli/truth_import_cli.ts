import { importTruthPayloadFromFile } from '../lib/truth/importer';

async function main() {
    const filePath = process.argv[2];
    if (!filePath) {
        console.error('Usage: npm run truth:import -- <payload.json>');
        process.exit(1);
    }

    const result = await importTruthPayloadFromFile(filePath);
    console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
