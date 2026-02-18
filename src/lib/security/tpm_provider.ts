import * as crypto from 'crypto';

/**
 * Simulates a TPM 2.0 Hardware Module.
 * In a real environment, this would interface with /dev/tpm0 via a native driver.
 */
export class MockTpmProvider {
    // PCRs (Platform Configuration Registers) represent the system state (Boot, OS, etc.)
    // If these change (e.g., malware alters the kernel), unsealing fails.
    private static PCRs: Record<number, string> = {
        0: "BOOT_INTEGRITY_HASH_VALID",
        7: "SECURE_BOOT_ENABLED"
    };

    private static STORAGE_ROOT_KEY = "HARDWARE_BOUND_SECRET_KEY";

    /**
     * SEALING: Encrypts data and binds it to the current PCR state.
     * The data can ONLY be decrypted if the PCRs match at unseal time.
     */
    static seal(data: Buffer): Buffer {
        const pcrState = JSON.stringify(this.PCRs);
        const bindingHash = crypto.createHash('sha256').update(pcrState).digest();

        // Simulate encryption with a key derived from Hardware Key + PCR State
        const wrappingKey = crypto.createHmac('sha256', this.STORAGE_ROOT_KEY)
            .update(bindingHash)
            .digest();

        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-cbc', wrappingKey, iv);

        return Buffer.concat([iv, cipher.update(data), cipher.final()]);
    }

    /**
     * UNSEALING: Decrypts data ONLY if the hardware state is valid.
     */
    static unseal(blob: Buffer): Buffer {
        const pcrState = JSON.stringify(this.PCRs);
        const bindingHash = crypto.createHash('sha256').update(pcrState).digest();

        const wrappingKey = crypto.createHmac('sha256', this.STORAGE_ROOT_KEY)
            .update(bindingHash)
            .digest();

        const iv = blob.subarray(0, 16);
        const encrypted = blob.subarray(16);

        try {
            const decipher = crypto.createDecipheriv('aes-256-cbc', wrappingKey, iv);
            return Buffer.concat([decipher.update(encrypted), decipher.final()]);
        } catch (e) {
            throw new Error("[TPM] 🛑 UNSEAL FAILED. System integrity compromised or PCR mismatch.");
        }
    }

    /**
     * ATTESTATION: Returns a signed quote of the system state + provided nonce.
     */
    static getAttestationQuote(nonce: string): string {
        const quoteData = JSON.stringify(this.PCRs) + nonce;
        // Sign with the "Attestation Key" (AK)
        return crypto.createSign('SHA256').update(quoteData).sign(this.generateMockPrivateKey(), 'hex');
    }

    // Helper for mock key generation
    private static generateMockPrivateKey(): string {
        // In reality, this key never leaves the TPM.
        const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
        return privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;
    }

    // Test Helper: Simulate an attack
    static simulateTampering() {
        this.PCRs[0] = "MALICIOUS_KERNEL_LOADED";
    }
}
