import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { ingestClaimsFromText } from '../lib/truth/ingest';
import { resolveTruthForClaimKey } from '../lib/truth/resolver';
import { buildTruthGraph } from '../lib/truth/graph';
import { addFocusTag, upsertChatTurn } from '../context-core/store';

const HOST = '127.0.0.1';
const PORT = 4317;
const repoRoot = path.resolve(__dirname, '../..');
const workspaceHtml = path.join(repoRoot, 'src/electron/renderer/workspace.html');

function json(res: http.ServerResponse, code: number, data: unknown) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

async function handleImport(req: http.IncomingMessage, res: http.ServerResponse) {
  let body = '';
  for await (const chunk of req) body += chunk;

  const parsed = JSON.parse(body || '{}') as { scope?: string; text?: string; sourceId?: string; provider?: string };
  const scope = parsed.scope ?? 'MINDMAP';
  const sourceId = parsed.sourceId ?? `workspace:${Date.now()}`;
  const provider = parsed.provider ?? 'manual';
  const text = parsed.text ?? '';

  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let inserted = 0;
  let resolved = 0;

  for (const line of lines) {
    await upsertChatTurn({
      provider: provider as any,
      scope,
      conversationId: sourceId,
      messageId: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      role: 'user',
      text: line,
      timestamp: new Date().toISOString(),
      sourceUrl: 'workspace://input',
      meta: { source: 'workspace_server' },
    });

    const r = await ingestClaimsFromText({
      sourceType: 'text',
      sourceId,
      rawText: line,
      contextTags: ['workspace-live'],
      createdBy: 'workspace-server',
    });
    inserted += r.inserted;

    const m = line.match(/^(.+)\s+is\s+(.+)$/i);
    if (m && r.inserted > 0) {
      const claimKey = `${m[1].trim().toLowerCase()}.is`;
      await resolveTruthForClaimKey({ scope, claimKey, generatedBy: 'workspace-server' });
      resolved += 1;
    }
  }

  const graph = await buildTruthGraph(scope);
  json(res, 200, { ok: true, lines: lines.length, inserted, resolved, graph });
}

async function handleGraph(req: http.IncomingMessage, res: http.ServerResponse, url: URL) {
  const scope = url.searchParams.get('scope') ?? 'MINDMAP';
  const graph = await buildTruthGraph(scope);
  json(res, 200, { ok: true, graph });
}

async function handleFocusTag(req: http.IncomingMessage, res: http.ServerResponse) {
  let body = '';
  for await (const chunk of req) body += chunk;

  const parsed = JSON.parse(body || '{}') as {
    scope?: string;
    targetType?: 'claim' | 'truth' | 'turn';
    targetId?: string;
    tag?: 'important' | 'watch' | 'ignore' | 'verify';
    note?: string;
  };

  if (!parsed.targetType || !parsed.targetId || !parsed.tag) {
    return json(res, 400, { ok: false, error: 'invalid focus payload' });
  }

  await addFocusTag({
    scope: parsed.scope ?? 'MINDMAP',
    targetType: parsed.targetType,
    targetId: parsed.targetId,
    tag: parsed.tag,
    note: parsed.note,
    createdBy: 'workspace-user',
  });

  return json(res, 200, { ok: true });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${HOST}:${PORT}`);

    if (req.method === 'GET' && url.pathname === '/') {
      const html = fs.readFileSync(workspaceHtml, 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/import') {
      await handleImport(req, res);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/graph') {
      await handleGraph(req, res, url);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/focus-tag') {
      await handleFocusTag(req, res);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  } catch (err) {
    json(res, 500, { ok: false, error: String(err) });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Workspace server running at http://${HOST}:${PORT}`);
});
