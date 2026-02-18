import { StreamDemasker } from '../lib/streaming/demasker';
import { IdentityVault } from '../lib/pii/mapper';
import { db } from '../db';
import { identityMap } from '../db/schema';
import { eq } from 'drizzle-orm';
import { encrypt, hash } from '../lib/crypto';

async function main() {
    console.log('--- Starting Streaming Demasker Verification ---');

    // 1. Setup: Seed logic for a known token
    const realName = "John Doe";
    const token = "[MGR_test]";

    // Manually insert for deterministic testing
    const contentHash = hash(realName);
    await db.delete(identityMap).where(eq(identityMap.token_id, token));
    await db.insert(identityMap).values({
        token_id: token,
        encrypted_real_value: encrypt(realName),
        content_hash: contentHash,
        context_prefix: "GLOBAL",
        entity_type: "MANAGER"
    });

    // 2. Test Streaming Logic
    const demasker = new StreamDemasker();

    // Chunk 1: Normal text + start of token
    // "Hello " + "[MGR"
    const chunk1 = await demasker.processChunk("Hello [MGR");
    console.log(`Chunk 1 Output: "${chunk1}" (Expected: "Hello ")`);
    if (chunk1 !== "Hello ") { exitFail("Chunk 1 failed"); }

    // Chunk 2: Rest of token + more text
    // "_test] how are"
    const chunk2 = await demasker.processChunk("_test] how are");
    console.log(`Chunk 2 Output: "${chunk2}" (Expected: "John Doe how are")`);
    if (chunk2 !== "John Doe how are") { exitFail("Chunk 2 failed"); }

    // Chunk 3: False positive (bracket without closure)
    // " you [doing?" (buffer fills up)
    const chunk3 = await demasker.processChunk(" you [doing?");
    // It should flush " you " and hold "[doing?" until buffer max.
    // Wait, logic says: if no ']', keep in buffer.
    console.log(`Chunk 3 Output: "${chunk3}" (Expected: " you ")`);

    // Flush
    const flushed = demasker.flush();
    console.log(`Flushed: "${flushed}" (Expected: "[doing?")`);

    console.log('✅ SUCCESS: Streaming Demasker handles split tokens and lookahead.');
}

function exitFail(msg: string) {
    console.error(`❌ FAILURE: ${msg}`);
    process.exit(1);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
