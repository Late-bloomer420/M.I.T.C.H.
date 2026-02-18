import crypto from 'node:crypto';

// In production, this secret key should be distinct from the vault key
const TOKEN_SECRET = process.env.TOKEN_SECRET || crypto.randomBytes(32).toString('hex');

interface TokenPayload {
    agentId: string;
    toolName: string;
    timestamp: number;
}

export class ToolTokenProvider {
    static generateToolToken(agentId: string, toolName: string): string {
        const timestamp = Date.now();
        const payload = `${agentId}:${toolName}:${timestamp}`;
        const signature = crypto
            .createHmac('sha256', TOKEN_SECRET)
            .update(payload)
            .digest('hex');

        // Return format: payload_base64.signature
        const payloadB64 = Buffer.from(payload).toString('base64');
        return `${payloadB64}.${signature}`;
    }

    static verifyToolToken(token: string, toolName: string): boolean {
        try {
            const [payloadB64, signature] = token.split('.');
            if (!payloadB64 || !signature) return false;

            const payload = Buffer.from(payloadB64, 'base64').toString('utf-8');
            const [agentId, tool, timestampStr] = payload.split(':');
            const timestamp = parseInt(timestampStr, 10);

            // 1. Verify Scope
            if (tool !== toolName) return false;

            // 2. Verify Expiration (60s TTL)
            const now = Date.now();
            if (now - timestamp > 60000) return false; // Expired
            if (now < timestamp) return false; // Time travel check

            // 3. Verify Signature
            const expectedSignature = crypto
                .createHmac('sha256', TOKEN_SECRET)
                .update(payload)
                .digest('hex');

            return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
        } catch (e) {
            return false;
        }
    }
}
