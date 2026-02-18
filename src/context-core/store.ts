import type { ChatTurnIngest, FeedbackPack } from './types';

const dedupe = new Set<string>();
const turns: ChatTurnIngest[] = [];

export function upsertChatTurn(turn: ChatTurnIngest): { inserted: boolean } {
  const key = `${turn.provider}:${turn.conversationId}:${turn.messageId}`;
  if (dedupe.has(key)) return { inserted: false };
  dedupe.add(key);
  turns.push(turn);
  return { inserted: true };
}

export function listTurns(scope = 'GLOBAL'): ChatTurnIngest[] {
  return turns.filter((t) => (t.scope ?? 'GLOBAL') === scope);
}

export function buildFeedbackPack(scope = 'GLOBAL'): FeedbackPack {
  // Placeholder heuristic pack. Real implementation will consume claims/snapshots/focus tables.
  return {
    scope,
    stableTruths: [],
    keyDeltas: [],
    unresolvedConflicts: [],
    focusAnchors: [],
    generatedAt: new Date().toISOString(),
  };
}
