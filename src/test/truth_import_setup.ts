import fs from 'node:fs';
import path from 'node:path';
import { importTruthPayloadFromFile } from '../lib/truth/importer';

async function main() {
    console.log('--- Truth Import Setup Test ---');

    const tmp = path.resolve(__dirname, '../../tmp_truth_import.json');
    const payload = {
        version: '1.0',
        scope: 'MINDMAP',
        items: [
            {
                sourceType: 'text',
                sourceId: 'drop/file-a.txt',
                text: 'Vision is clear\nAlice is Founder',
                contextTags: ['drop', 'apple-inspired-ui'],
            },
            {
                sourceType: 'transcript',
                sourceId: 'meeting/transcript-01',
                sourceRef: '00:01:10-00:01:30',
                text: 'Roadmap is stable',
                contextTags: ['meeting'],
            },
        ],
    };

    fs.writeFileSync(tmp, JSON.stringify(payload, null, 2), 'utf8');
    const res = await importTruthPayloadFromFile(tmp);
    fs.unlinkSync(tmp);

    if (res.importedItems !== 2) {
        console.error(`❌ FAILURE: expected 2 imported items, got ${res.importedItems}`);
        process.exit(1);
    }

    if (res.insertedClaims < 3) {
        console.error(`❌ FAILURE: expected >=3 inserted claims, got ${res.insertedClaims}`);
        process.exit(1);
    }

    console.log('✅ SUCCESS: drag/drop import payload ingested into claims store.');
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
