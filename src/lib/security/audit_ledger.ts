import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { KillSwitch } from '../security/killswitch';

export interface LogEntry {
    timestamp: string;
    eventType: string;
    actorId: string;
    payload: any; // Storing actual data for auditing
    payloadHash: string;
    prevHash: string;
    tpmSignature?: string; // Placeholder for Task 6
}

export class AuditLedger {
    private static ledgerPath = path.resolve(__dirname, '../../../audit.ledger');
    private static lastHash: string = AuditLedger.initLastHash();

    private static initLastHash(): string {
        if (fs.existsSync(AuditLedger.ledgerPath)) {
            const content = fs.readFileSync(AuditLedger.ledgerPath, 'utf-8').trim();
            if (content) {
                const lines = content.split('\n');
                const lastLine = lines[lines.length - 1];
                const separatorIndex = lastLine.indexOf('|');
                if (separatorIndex !== -1) {
                    return lastLine.substring(0, separatorIndex);
                }
            }
        }
        return "GENESIS_HASH_00000000000000000000000000000000";
    }

    // TEST-ONLY: Resets the in-memory state
    static reset() {
        this.lastHash = "GENESIS_HASH_00000000000000000000000000000000";
    }

    /**
     * Appends a new tamper-evident entry to the log.
     */
    static async log(eventType: string, actorId: string, payload: any) {
        // 1. Ensure ledger exists and load last hash if needed
        // In a real high-throughput system, we'd cache the lastHash in memory 
        // but check the file occasionally. For this proto, we trust memory or re-read on startup.
        // To be safe/simple, we just append.

        // 2. Prepare Data
        const timestamp = new Date().toISOString();
        const payloadStr = JSON.stringify(payload);
        const payloadHash = crypto.createHash('sha256').update(payloadStr).digest('hex');

        // 3. Construct Entry
        const entry: LogEntry = {
            timestamp,
            eventType,
            actorId,
            payload, // Store the actual data
            payloadHash,
            prevHash: this.lastHash,
            tpmSignature: "PENDING_TPM_SIGNATURE" // Task 6 integration point
        };

        // 4. Serialize & Calculate Structure Hash (Current Block Hash)
        // This hash represents the state of the chain at this point.
        const entryString = JSON.stringify(entry);
        const entryHash = crypto.createHash('sha256').update(entryString).digest('hex');

        // 5. Update State
        this.lastHash = entryHash;

        // 6. Write to File (Append-Only)
        // Format: HASH | JSON_ENTRY
        const line = `${entryHash}|${entryString}\n`;
        fs.appendFileSync(this.ledgerPath, line);

        console.log(`[Audit] ⛓️ New Block: ${entryHash.substring(0, 8)}... (Event: ${eventType})`);
    }

    /**
     * Verifies the integrity of the entire chain.
     * Runs in < 100ms for typical log sizes.
     */
    static verifyChain(): boolean {
        if (!fs.existsSync(this.ledgerPath)) {
            return true; // Empty is valid
        }

        const content = fs.readFileSync(this.ledgerPath, 'utf-8').trim();
        if (!content) return true;

        const lines = content.split('\n').filter(line => line.trim() !== '');
        let calculatedPrevHash = "GENESIS_HASH_00000000000000000000000000000000";

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Robust split: Hash is first 64 chars (sha256 hex), followed by |
            const separatorIndex = line.indexOf('|');
            if (separatorIndex === -1) {
                console.error(`[Audit] 🚨 MALFORMED LINE at Block ${i}: No separator found.`);
                this.triggerSecurityProtocol();
                return false;
            }

            const storedHash = line.substring(0, separatorIndex);
            const jsonStr = line.substring(separatorIndex + 1);

            try {
                const entry: LogEntry = JSON.parse(jsonStr);

                // Check 1: Chain Continuity
                if (entry.prevHash !== calculatedPrevHash) {
                    console.error(`[Audit] 🚨 BROKEN CHAIN at Block ${i}! PrevHash mismatch.`);
                    console.error(`  Expected Prev: ${calculatedPrevHash}`);
                    console.error(`  Found Prev:    ${entry.prevHash}`);
                    this.triggerSecurityProtocol();
                    return false;
                }

                // Check 2: Content Integrity
                const recalculatedHash = crypto.createHash('sha256').update(jsonStr).digest('hex');
                if (recalculatedHash !== storedHash) {
                    console.error(`[Audit] 🚨 TAMPERING DETECTED at Block ${i}! Content hash mismatch.`);
                    console.error(`  Stored Hash:   ${storedHash}`);
                    console.error(`  Calculated:    ${recalculatedHash}`);
                    console.error(`  Content:       ${jsonStr.substring(0, 50)}...`);
                    this.triggerSecurityProtocol();
                    return false;
                }

                // Valid block, move pointer
                calculatedPrevHash = recalculatedHash;

            } catch (e) {
                console.error(`[Audit] 🚨 CORRUPT LOG LINE at Block ${i}: ${e}`);
                this.triggerSecurityProtocol();
                return false;
            }
        }

        console.log(`[Audit] ✅ Ledger Integrity Verified (${lines.length} blocks).`);
        return true;
    }

    private static triggerSecurityProtocol() {
        console.error(`[Audit] CRITICAL SECURITY FAILURE. ENGAGING KILL-SWITCH.`);
        KillSwitch.engageLock("Audit Ledger Integrity Failure");
    }
}
