import { addFocusTag, buildFeedbackPack, listTurns, upsertChatTurn } from '../context-core/store';

async function main() {
  console.log('--- Context Core Setup Test ---');

  const t1 = await upsertChatTurn({
    provider: 'manual',
    scope: 'GLOBAL',
    conversationId: 'conv-A',
    messageId: 'm1',
    role: 'assistant',
    text: 'Alice is CEO',
    timestamp: new Date().toISOString(),
  });

  const t2 = await upsertChatTurn({
    provider: 'manual',
    scope: 'GLOBAL',
    conversationId: 'conv-A',
    messageId: 'm1',
    role: 'assistant',
    text: 'Alice is CEO',
    timestamp: new Date().toISOString(),
  });

  if (!t1.inserted || t2.inserted) {
    console.error('❌ FAILURE: dedupe behavior incorrect.');
    process.exit(1);
  }

  await addFocusTag({
    scope: 'GLOBAL',
    targetType: 'turn',
    targetId: 'conv-A:m1',
    tag: 'important',
    note: 'core fact',
  });

  const turns = await listTurns('GLOBAL');
  if (turns.length < 1) {
    console.error('❌ FAILURE: expected persisted turns.');
    process.exit(1);
  }

  const pack = await buildFeedbackPack('GLOBAL');
  if (!Array.isArray(pack.focusAnchors)) {
    console.error('❌ FAILURE: feedback pack malformed.');
    process.exit(1);
  }

  console.log('✅ SUCCESS: context-core persistence, dedupe, and focus tags work.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
