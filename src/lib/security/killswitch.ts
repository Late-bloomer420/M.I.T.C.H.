import fs from 'fs';
import path from 'path';

export class KillSwitch {
    private static _isLocked: boolean = false;
    private static _isDestroyed: boolean = false;
    private static _lastReason: string = 'System OK';

    static get isLocked(): boolean {
        return this._isLocked || this._isDestroyed;
    }

    static get lastReason(): string {
        return this._lastReason;
    }

    static engageLock(reason: string = "Manual Admin Action") {
        console.log(`[KillSwitch] 🛑 SYSTEM LOCK ENGAGED! Reason: ${reason}`);
        this._isLocked = true;
        this._lastReason = reason;
    }

    static resetLock(adminKey: string) {
        if (adminKey === "SECRET_ADMIN_KEY") {
            console.log(`[KillSwitch] 🟢 System Unlocked by Admin.`);
            this._isLocked = false;
            this._lastReason = 'System OK';
        } else {
            console.log(`[KillSwitch] ⚠️ Unauthorized unlock attempt.`);
        }
    }

    static async engageSelfDestruct(confirmation: string) {
        if (confirmation !== "CONFIRM_DESTRUCTION") {
            console.log(`[KillSwitch] ⚠️ Self-destruct aborted. Invalid confirmation.`);
            return;
        }

        console.log(`[KillSwitch] ☢️ NUCLEAR OPTION INITIATED...`);
        this._isLocked = true;
        this._isDestroyed = true;

        // 1. Wipe SQLite DB
        const dbPath = path.resolve(__dirname, '../../../sqlite.db');
        if (fs.existsSync(dbPath)) {
            try {
                // Secure overwrite (basic implementation)
                const stats = fs.statSync(dbPath);
                const zeros = Buffer.alloc(stats.size, 0);
                fs.writeFileSync(dbPath, zeros);
                fs.unlinkSync(dbPath);
                console.log(`[KillSwitch] 🗑️ Database securely wiped and deleted.`);
            } catch (e) {
                console.error(`[KillSwitch] ❌ Error wiping DB: ${e}`);
            }
        } else {
            console.log(`[KillSwitch] Database file not found (already gone?).`);
        }

        // 2. Clear Memory (Node process exit is the only real way to clear RAM)
        console.log(`[KillSwitch] 💀 Process Terminating...`);
        process.exit(1);
    }
}
