import http from 'node:http';
import { addFocusTag, buildFeedbackPack, listTurns, upsertChatTurn } from './store';
import type { ChatTurnIngest } from './types';

const HOST = '127.0.0.1';
const PORT = 4321;

function json(res: http.ServerResponse, code: number, data: unknown) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

async function readBody(req: http.IncomingMessage): Promise<string> {
  let body = '';
  for await (const c of req) body += c;
  return body;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${HOST}:${PORT}`);

    if (req.method === 'POST' && url.pathname === '/api/context/ingest/chat') {
      const body = await readBody(req);
      const turn = JSON.parse(body || '{}') as ChatTurnIngest;
      if (!turn.provider || !turn.conversationId || !turn.messageId || !turn.role || !turn.text || !turn.timestamp) {
        return json(res, 400, { ok: false, error: 'invalid payload' });
      }
      const r = await upsertChatTurn(turn);
      return json(res, 200, { ok: true, inserted: r.inserted });
    }

    if (req.method === 'POST' && url.pathname === '/api/context/focus-tag') {
      const body = await readBody(req);
      const p = JSON.parse(body || '{}') as {
        scope?: string;
        targetType?: 'claim' | 'truth' | 'turn';
        targetId?: string;
        tag?: 'important' | 'watch' | 'ignore' | 'verify';
        note?: string;
      };
      if (!p.targetType || !p.targetId || !p.tag) {
        return json(res, 400, { ok: false, error: 'invalid payload' });
      }
      await addFocusTag({
        scope: p.scope,
        targetType: p.targetType,
        targetId: p.targetId,
        tag: p.tag,
        note: p.note,
      });
      return json(res, 200, { ok: true });
    }

    if (req.method === 'GET' && url.pathname === '/api/context/turns') {
      const scope = url.searchParams.get('scope') ?? 'GLOBAL';
      const turns = await listTurns(scope);
      return json(res, 200, { ok: true, turns });
    }

    if (req.method === 'GET' && url.pathname === '/api/context/feedback-pack') {
      const scope = url.searchParams.get('scope') ?? 'GLOBAL';
      const pack = await buildFeedbackPack(scope);
      return json(res, 200, { ok: true, pack });
    }

    return json(res, 404, { ok: false, error: 'not found' });
  } catch (err) {
    return json(res, 500, { ok: false, error: String(err) });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Context Core listening on http://${HOST}:${PORT}`);
});
