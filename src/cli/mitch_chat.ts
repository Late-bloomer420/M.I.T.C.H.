import * as readline from 'readline';
import * as crypto from 'crypto';
import { KillSwitch } from '../lib/security/killswitch';
import { AuditLedger } from '../lib/security/audit_ledger';
import { RbacPolicy, UserContext } from '../lib/security/rbac_policy';
// In a real app, we'd import the Python Masker/Sanitizer via a bridge.
// For this prototype, we'll re-implement the sanitization logic in TS or assume the Orchestrator does it.
// Let's implement a simple TS Sanitizer/Masker here for the CLI wrapper to demonstrate the "Edge Filtering".

// Interface for decoupling I/O (Terminal vs Electron)
export interface IOInterface {
    input: (handler: (text: string) => void) => void;
    output: (text: string) => void;
    close: () => void;
}

/**
 * Secure Terminal Wrapper
 * Intercepts all input BEFORE it leaves the device.
 */
export class MitchChat {
    private user: UserContext;
    private io: IOInterface;

    constructor(user: UserContext, io: IOInterface) {
        this.user = user;
        this.io = io;
    }

    start() {
        this.io.output(`\n🛡️  miTch Secure Terminal [User: ${this.user.userId} | Role: ${this.user.role}]`);
        this.io.output("Type '/panic' to trigger Kill-Switch. Type 'exit' to quit.\n");

        // Listen for input
        this.io.input(async (text) => {
            await this.handleInput(text);
        });
    }

    /* removed private prompt() as it's specific to readline */

    async handleInput(input: string) {
        if (KillSwitch.isLocked) {
            this.io.output("\n❌ SYSTEM LOCKED. TERMINAL DISABLED.");
            return;
        }

        // 1. Local Command Check
        if (input.trim() === 'exit') {
            this.io.output("Goodbye.");
            this.io.close();
            // process.exit(0); // Let the host handle exit
            return;
        }

        if (input.trim() === '/panic') {
            this.io.output("🚨 PANIC TRIGGERED BY USER!");
            KillSwitch.engageLock("User Panic Command");
            return;
        }

        // 2. Anti-Malice Sanitization (Task 13)
        // Stripping invisible chars and tokenizing emojis
        // Simple TS implementation of what we did in Python
        const sanitized = this.sanitize(input);
        if (sanitized !== input) {
            this.io.output(`[Shield] Sanitized Input: "${sanitized}"`);
        }

        // 3. PII Masking (Task 2)
        // Replacing known entities with Tokens
        const masked = this.mask(sanitized);
        if (masked !== sanitized) {
            this.io.output(`[Shield] Masked PII: "${masked}"`);
        }

        // 4. Intent Binding (Task 14)
        // Generate Nonce for this specific interaction
        const nonce = crypto.randomBytes(16).toString('hex');

        // 5. Audit Log (Task 8)
        await AuditLedger.log("USER_INPUT", this.user.userId, {
            originalHash: crypto.createHash('sha256').update(input).digest('hex'),
            maskedContent: masked,
            nonce
        });

        // 6. "Send" to Cloud (Simulation)
        // In a real app, this sends { prompt: masked, nonce, signature } to the Cloud Agent
        this.io.output(`\n☁️  Sending Secure Payload to Cloud Reasoner:`);
        this.io.output(`   [Payload]: ${masked}`);
        this.io.output(`   [Intent]:  ${nonce} (Bound to this session)`);
        this.io.output(`   [Status]:  Waiting for encrypted response...\n`);
    }

    // --- Helper Functions (Simulating Edge Logic) ---

    private sanitize(text: string): string {
        // Remove invisible characters (like Zero Width Joiner \u200d)
        // And simple Emoji replacement for demo
        let clean = text.replace(/[\u200b\u200c\u200d\uFEFF]/g, '');
        clean = clean.replace(/💸/g, '[MONEY_WITH_WINGS]');
        clean = clean.replace(/⚔️/g, '[CROSSED_SWORDS]');
        return clean;
    }

    private mask(text: string): string {
        let out = text;
        if (out.includes("John Doe")) out = out.replace("John Doe", "[PER_1]");
        if (out.includes("Alice")) out = out.replace("Alice", "[PER_2]");
        return out;
    }
}

// Adapter for Console (Readline)
if (require.main === module) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const consoleIO: IOInterface = {
        input: (handler) => {
            rl.on('line', handler);
            rl.prompt();
        },
        output: (text) => console.log(text),
        close: () => rl.close()
    };

    const chat = new MitchChat({ userId: "Console_User", role: "ADMIN" }, consoleIO);
    chat.start();
}
