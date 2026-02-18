import { MitchChat, IOInterface } from '../cli/mitch_chat';
import { KillSwitch } from '../lib/security/killswitch';

// Simulate interactive chat without blocking readline
async function testChat() {
    console.log("--- Initializing Secure Chat Wrapper ---");

    const outputs: string[] = [];
    const io: IOInterface = {
        input: () => { /* not used in this test */ },
        output: (text: string) => {
            outputs.push(text);
            console.log(text);
        },
        close: () => {
            console.log('[IO] closed');
        }
    };

    const chat = new MitchChat({ userId: "Test_User", role: "ADMIN" }, io);

    // We bypass the readline loop and call handleInput directly for testing

    console.log("\n--- Test 1: Standard Input with PII ---");
    await chat.handleInput("Hello, I am John Doe and I want to Sende 💸.");
    // Expect: Masked [PER_1] and Sanitized [MONEY_WITH_WINGS]

    console.log("\n--- Test 2: Invisible Character Attack ---");
    await chat.handleInput("Hidden\u200dMessage");
    // Expect: HiddenMessage

    console.log("\n--- Test 3: Panic Command ---");
    await chat.handleInput("/panic");

    if (KillSwitch.isLocked) {
        console.log("✅ Kill-Switch successfully engaged via Terminal.");
    } else {
        console.error("❌ Kill-Switch FAILED to engage.");
        process.exit(1);
    }

    console.log("\n--- Test 4: Verify Lockout ---");
    await chat.handleInput("should be blocked");

    const hadMaskOutput = outputs.some((o) => o.includes('[Shield] Masked PII'));
    if (!hadMaskOutput) {
        console.error('❌ FAILURE: Expected masked output not found.');
        process.exit(1);
    }
}

testChat().catch((err) => {
    console.error(err);
    process.exit(1);
});
