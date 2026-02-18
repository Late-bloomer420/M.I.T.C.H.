import { sqliteTable, text, integer, unique } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const piiTypes = sqliteTable('pii_types', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull().unique(), // e.g., 'PERSON', 'EMAIL'
    pattern: text('pattern'), // Regex pattern (optional)
    sensitivity_level: text('sensitivity_level').default('HIGH'), // HIGH, MEDIUM, LOW
    created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

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

// Truth Core Step 1: canonical claim store with provenance and conflict metadata
export const claims = sqliteTable('claims', {
    id: text('id').primaryKey(),
    claim_key: text('claim_key').notNull(), // stable semantic key (e.g. "ceo.company")
    normalized_claim: text('normalized_claim').notNull(),
    subject: text('subject').notNull(),
    predicate: text('predicate').notNull(),
    object_value: text('object_value').notNull(),

    source_type: text('source_type').notNull(), // text | agent_conversation | transcript | video_transcript
    source_id: text('source_id').notNull(), // file path, conversation id, transcript id
    source_ref: text('source_ref'), // line range, message id, segment timestamp

    confidence: integer('confidence').notNull().default(50), // 0-100
    happened_at: text('happened_at'), // evidence event time
    ingested_at: text('ingested_at').default(sql`CURRENT_TIMESTAMP`),

    conflict_group: text('conflict_group'),
    status: text('status').notNull().default('active'), // active | superseded | conflicted | rejected
    context_tags_json: text('context_tags_json').notNull().default('[]'),

    created_by: text('created_by').notNull().default('truth-ingestor-v1'),
});

export const truthSnapshots = sqliteTable('truth_snapshots', {
    id: text('id').primaryKey(),
    scope: text('scope').notNull().default('GLOBAL'), // e.g. GLOBAL, PROJECT_X
    claim_key: text('claim_key').notNull().default('global.unknown'),
    single_line_of_truth: text('single_line_of_truth').notNull(),
    supporting_claim_ids_json: text('supporting_claim_ids_json').notNull().default('[]'),
    conflicts_json: text('conflicts_json').notNull().default('[]'),
    rationale: text('rationale'),
    confidence: integer('confidence').notNull().default(50),
    generated_by: text('generated_by').notNull().default('truth-resolver-v1'),
    generated_at: text('generated_at').default(sql`CURRENT_TIMESTAMP`),
});

// Context Core persistence
export const contextTurns = sqliteTable('context_turns', {
    id: text('id').primaryKey(),
    provider: text('provider').notNull(),
    scope: text('scope').notNull().default('GLOBAL'),
    conversation_id: text('conversation_id').notNull(),
    message_id: text('message_id').notNull(),
    role: text('role').notNull(),
    text: text('text').notNull(),
    timestamp: text('timestamp').notNull(),
    source_url: text('source_url'),
    meta_json: text('meta_json').notNull().default('{}'),
    created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (t) => ({
    unq: unique().on(t.provider, t.conversation_id, t.message_id),
}));

export const focusTags = sqliteTable('focus_tags', {
    id: text('id').primaryKey(),
    scope: text('scope').notNull().default('GLOBAL'),
    target_type: text('target_type').notNull(), // claim | truth | turn
    target_id: text('target_id').notNull(),
    tag: text('tag').notNull(), // important | watch | ignore | verify
    note: text('note'),
    created_by: text('created_by').notNull().default('user'),
    created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});
