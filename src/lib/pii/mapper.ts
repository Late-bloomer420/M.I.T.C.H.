import { db } from '../../db';
import { piiTypes, identityMap } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import { encrypt, decrypt, hash } from '../crypto';
import crypto from 'node:crypto';

export class IdentityVault {
    static async registerPiiType(name: string, sensitivity: string = 'HIGH') {
        try {
            await db.insert(piiTypes).values({
                name,
                sensitivity_level: sensitivity,
            });
            console.log(`Registered PII Type: ${name}`);
        } catch (e) {
            // Ignore if exists
        }
    }

    static async tokenize(realValue: string, entityType: string, contextPrefix: string = 'GLOBAL'): Promise<string> {
        const contentHash = hash(realValue);

        // 1. Check if mapping already exists using the hash + context
        const existing = await db
            .select()
            .from(identityMap)
            .where(
                and(
                    eq(identityMap.content_hash, contentHash),
                    eq(identityMap.context_prefix, contextPrefix)
                )
            )
            .get();

        if (existing) {
            return existing.token_id;
        }

        // 2. Create new token if not exists
        // Compression: Use short codes if possible. 
        // MGR -> MANAGER, PER -> PERSON. 
        // Format: [PREFIX:TYPE_ID]
        const shortType = entityType.substring(0, 3).toUpperCase();
        const uniqueId = crypto.randomBytes(4).toString('hex');
        const tokenId = `[${shortType}_${uniqueId}]`; // e.g. [PER_a1b2]

        const encrypted = encrypt(realValue);

        await db.insert(identityMap).values({
            token_id: tokenId,
            encrypted_real_value: encrypted,
            content_hash: contentHash,
            context_prefix: contextPrefix,
            entity_type: entityType,
        });

        return tokenId;
    }

    static async deanonymize(tokenId: string): Promise<string | null> {
        const result = await db.select().from(identityMap).where(eq(identityMap.token_id, tokenId)).get();

        if (!result) return null;

        return decrypt(result.encrypted_real_value);
    }
}
