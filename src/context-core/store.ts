import { randomUUID } from 'node:crypto';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '../db';
import { contextTurns, focusTags, truthSnapshots } from '../db/schema';
import type { ChatTurnIngest, FeedbackPack } from './types';

export async function upsertChatTurn(turn: ChatTurnIngest): Promise<{ inserted: boolean }> {
  try {
    await db.insert(contextTurns).values({
      id: randomUUID(),
      provider: turn.provider,
      scope: turn.scope ?? 'GLOBAL',
      conversation_id: turn.conversationId,
      message_id: turn.messageId,
      role: turn.role,
      text: turn.text,
      timestamp: turn.timestamp,
      source_url: turn.sourceUrl,
      meta_json: JSON.stringify(turn.meta ?? {}),
    });
    return { inserted: true };
  } catch (err) {
    const msg = String(err);
    if (msg.includes('UNIQUE') || msg.includes('unique')) {
      return { inserted: false };
    }
    throw err;
  }
}

export async function listTurns(scope = 'GLOBAL'): Promise<ChatTurnIngest[]> {
  const rows = await db
    .select()
    .from(contextTurns)
    .where(eq(contextTurns.scope, scope))
    .orderBy(desc(contextTurns.timestamp));

  return rows.map((r) => ({
    provider: r.provider as ChatTurnIngest['provider'],
    scope: r.scope,
    conversationId: r.conversation_id,
    messageId: r.message_id,
    role: r.role as ChatTurnIngest['role'],
    text: r.text,
    timestamp: r.timestamp,
    sourceUrl: r.source_url ?? undefined,
    meta: (() => {
      try { return JSON.parse(r.meta_json); } catch { return {}; }
    })(),
  }));
}

export async function addFocusTag(input: {
  scope?: string;
  targetType: 'claim' | 'truth' | 'turn';
  targetId: string;
  tag: 'important' | 'watch' | 'ignore' | 'verify';
  note?: string;
  createdBy?: string;
}): Promise<void> {
  await db.insert(focusTags).values({
    id: randomUUID(),
    scope: input.scope ?? 'GLOBAL',
    target_type: input.targetType,
    target_id: input.targetId,
    tag: input.tag,
    note: input.note,
    created_by: input.createdBy ?? 'user',
  });
}

export async function buildFeedbackPack(scope = 'GLOBAL'): Promise<FeedbackPack> {
  const snaps = await db
    .select()
    .from(truthSnapshots)
    .where(eq(truthSnapshots.scope, scope))
    .orderBy(desc(truthSnapshots.generated_at))
    .limit(5);

  const stableTruths = snaps.map((s) => s.single_line_of_truth);
  const unresolvedConflicts = snaps
    .map((s) => {
      try {
        const c = JSON.parse(s.conflicts_json) as Array<{ note?: string }>;
        return c.map((x) => x.note).filter(Boolean) as string[];
      } catch {
        return [] as string[];
      }
    })
    .flat();

  const tags = await db
    .select()
    .from(focusTags)
    .where(and(eq(focusTags.scope, scope), eq(focusTags.tag, 'important')))
    .orderBy(desc(focusTags.created_at))
    .limit(10);

  const focusAnchors = tags.map((t) => `${t.target_type}:${t.target_id}`);

  return {
    scope,
    stableTruths,
    keyDeltas: [],
    unresolvedConflicts,
    focusAnchors,
    generatedAt: new Date().toISOString(),
  };
}
