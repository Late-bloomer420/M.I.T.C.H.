import { AuditLedger } from '../lib/security/audit_ledger';
import * as fs from 'fs';
import * as path from 'path';

async function testAudit() {
    const ledgerPath = path.resolve(__dirname, '../../audit.ledger');
    if (fs.existsSync(ledgerPath)) fs.unlinkSync(ledgerPath);
    AuditLedger.reset();

    console.log("--- 1. Generating Secure Logs ---");
    await AuditLedger.log("SYSTEM_START", "ROOT", { version: "1.0" });
    await AuditLedger.log("USER_LOGIN", "USER_1", { method: "MFA" });
    await AuditLedger.log("DATA_ACCESS", "USER_1", { resource: "File A" });

    console.log("\n--- 2. Verifying Chain Integrity (Should PASS) ---");
    let isValid = AuditLedger.verifyChain();
    if (isValid) console.log("✅ Chain is VALID.");
    else console.error("❌ Chain is INVALID.");

    console.log("\n--- 3. Simulating Tampering Attack ---");
    // The variable ledgerPath is already declared and can be reused.
    let content = fs.readFileSync(ledgerPath, 'utf-8');

    // Attack: Change "File A" to "File B" in the last entry, but keep the hash same
    const tampering = content.replace("File A", "File B");
    fs.writeFileSync(ledgerPath, tampering);
    console.log("😈 Intruder modified audit.ledger: 'File A' -> 'File B'");

    console.log("\n--- 4. Verifying Chain Integrity (Should FAIL) ---");
    isValid = AuditLedger.verifyChain();
    if (isValid) console.log("❌ Chain is VALID (Tampering NOT detected!)");
    else console.log("✅ Tampering DETECTED successfully.");

    // Cleanup
    // fs.unlinkSync(ledgerPath);
}

testAudit();
