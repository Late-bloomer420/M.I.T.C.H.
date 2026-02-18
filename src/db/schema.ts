import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const piiTypes = sqliteTable('pii_types', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull().unique(), // e.g., 'PERSON', 'EMAIL'
    pattern: text('pattern'), // Regex pattern (optional)
    sensitivity_level: text('sensitivity_level').default('HIGH'), // HIGH, MEDIUM, LOW
    created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

import { unique } from 'drizzle-orm/sqlite-core';

export const identityMap = sqliteTable('identity_map', {
    token_id: text('token_id').primaryKey(), // UUID
    encrypted_real_value: text('encrypted_real_value').notNull(),
    content_hash: text('content_hash').notNull(), // HMAC(real_value) for lookups
    context_prefix: text('context_prefix').notNull().default('GLOBAL'), // Namespace
    entity_type: text('entity_type').notNull(), // References pii_types.name or enum
    created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (t) => ({
    unq: unique().on(t.content_hash, t.context_prefix),
}));

export const dataMappings = sqliteTable('data_mappings', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    source_field: text('source_field').notNull(),
    pii_type_id: integer('pii_type_id').references(() => piiTypes.id),
    description: text('description'),
});
