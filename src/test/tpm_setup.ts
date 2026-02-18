import { MockTpmProvider } from '../lib/security/tpm_provider';
import * as crypto from 'crypto';

async function testTpm() {
    console.log("--- 1. Provisioning Vault Master Key (Sealing) ---");
    const masterKey = crypto.randomBytes(32); // The secret
    console.log("Original Key:", masterKey.toString('hex').substring(0, 16) + "...");

    const sealedBlob = MockTpmProvider.seal(masterKey);
    console.log("Sealed Blob: ", sealedBlob.toString('hex').substring(0, 32) + "...");
    console.log("✅ Key securely sealed to PCR state.");

    console.log("\n--- 2. Valid Access (Unsealing on clean boot) ---");
    try {
        const unsealedKey = MockTpmProvider.unseal(sealedBlob);
        console.log("Unsealed Key:", unsealedKey.toString('hex').substring(0, 16) + "...");

        if (unsealedKey.equals(masterKey)) {
            console.log("✅ SUCCESS: Keys match.");
        } else {
            console.error("❌ FAILURE: Keys do not match.");
        }
    } catch (e) {
        console.error(e);
    }

    console.log("\n--- 3. Simulating Evil Maid Attack (Tampering) ---");
    MockTpmProvider.simulateTampering();
    console.log("😈 Intruder modified bootloader (PCR[0] changed).");

    console.log("\n--- 4. Invalid Access (Unsealing should FAIL) ---");
    try {
        MockTpmProvider.unseal(sealedBlob);
        console.error("❌ FAILURE: Unseal succeeded despite tampering!");
    } catch (e) {
        console.log(`✅ SUCCESS: TPM blocked access. Error: ${(e as Error).message}`);
    }
}

testTpm();
