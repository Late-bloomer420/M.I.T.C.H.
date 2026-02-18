export type Provider = 'openclaw' | 'chatgpt' | 'gemini' | 'manual' | 'unknown';

export interface ChatTurnIngest {
  provider: Provider;
  conversationId: string;
  messageId: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: string;
  sourceUrl?: string;
  scope?: string;
  meta?: Record<string, unknown>;
}

export interface TextIngest {
  sourceId: string;
  text: string;
  scope?: string;
  tags?: string[];
}

export interface FeedbackPack {
  scope: string;
  stableTruths: string[];
  keyDeltas: string[];
  unresolvedConflicts: string[];
  focusAnchors: string[];
  generatedAt: string;
}
