import { IdentityVault } from '../lib/pii/mapper';
import { db } from '../db';
import { piiTypes } from '../db/schema';
import { eq } from 'drizzle-orm';

async function main() {
    console.log('--- Starting Identity Vault Verification (Context Namespacing) ---');

    // 1. Initial Setup: Register Types
    await IdentityVault.registerPiiType('PERSON', 'HIGH');

    const realName = "Alice Wonderland";

    // 2. Tokenize in GLOBAL context
    console.log(`Tokenizing "${realName}" in GLOBAL context...`);
    const tokenGlobal = await IdentityVault.tokenize(realName, 'PERSON', 'GLOBAL');
    console.log(`GLOBAL Token: ${tokenGlobal}`);

    // 3. Tokenize in FINANCE context (Should be DIFFERENT)
    console.log(`Tokenizing "${realName}" in FINANCE context...`);
    const tokenFinance = await IdentityVault.tokenize(realName, 'PERSON', 'FINANCE');
    console.log(`FINANCE Token: ${tokenFinance}`);

    if (tokenGlobal !== tokenFinance) {
        console.log('✅ SUCCESS: Tokens are different across contexts.');
    } else {
        console.error('❌ FAILURE: Tokens collided!');
        process.exit(1);
    }

    // 4. Verify Consistency within Context
    const tokenFinance2 = await IdentityVault.tokenize(realName, 'PERSON', 'FINANCE');
    if (tokenFinance === tokenFinance2) {
        console.log('✅ SUCCESS: Consistent token within FINANCE context.');
    } else {
        console.error('❌ FAILURE: Inconsistent token in same context!');
        process.exit(1);
    }

    console.log('--- Verification Complete ---');
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
