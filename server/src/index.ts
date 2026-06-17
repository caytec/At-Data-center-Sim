/**
 * GigaRack backend — a tiny HTTP service for the global leaderboard and the
 * shared market-demand index. Built on Node's standard library only
 * (node:http + node:sqlite), so it installs and runs anywhere Node 22+ does.
 *
 *   GET  /health             -> { ok: true }
 *   GET  /demand             -> { demand: number }   shared 0..~1.05 market index
 *   GET  /leaderboard?board=&playerId=  -> LeaderboardRow[]
 *   POST /scores             -> { ok: true } | 400 { error }
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { leaderboard, recordScore } from './db.ts';
import { validateSubmission, type Board } from './validate.ts';

const PORT = Number(process.env.PORT || 8787);

// --- helpers ---
function send(res: ServerResponse, status: number, data: unknown): void {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'content-type': 'application/json',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type',
    'cache-control': 'no-store',
  });
  res.end(body);
}

function readJson(req: IncomingMessage, limitBytes = 4096): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => {
      size += c.length;
      if (size > limitBytes) {
        reject(new Error('payload too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch {
        reject(new Error('invalid json'));
      }
    });
    req.on('error', reject);
  });
}

// --- simple per-IP rate limit for writes (token bucket) ---
const buckets = new Map<string, { tokens: number; ts: number }>();
function allowWrite(ip: string): boolean {
  const now = Date.now();
  const refillPerSec = 2; // sustained 2 writes/sec
  const capacity = 20;
  const b = buckets.get(ip) ?? { tokens: capacity, ts: now };
  b.tokens = Math.min(capacity, b.tokens + ((now - b.ts) / 1000) * refillPerSec);
  b.ts = now;
  if (b.tokens < 1) {
    buckets.set(ip, b);
    return false;
  }
  b.tokens -= 1;
  buckets.set(ip, b);
  return true;
}

/**
 * Shared market demand index. Deterministic from wall-clock time so every player
 * sees the same value — a light "one global market" signal. Oscillates ~0.62..1.0
 * over a few real hours, with a faster ripple on top.
 */
function currentDemand(): number {
  const t = Date.now() / 1000;
  const slow = Math.sin((t / (3600 * 3)) * 2 * Math.PI); // ~3h cycle
  const fast = Math.sin((t / 600) * 2 * Math.PI); // ~10min ripple
  const demand = 0.82 + 0.16 * slow + 0.04 * fast;
  return Math.max(0.5, Math.min(1.05, Number(demand.toFixed(4))));
}

const server = createServer(async (req, res) => {
  const ip = (req.socket.remoteAddress || 'unknown').toString();
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'OPTIONS') return send(res, 204, {});

  try {
    if (req.method === 'GET' && url.pathname === '/health') return send(res, 200, { ok: true });

    if (req.method === 'GET' && url.pathname === '/demand') return send(res, 200, { demand: currentDemand() });

    if (req.method === 'GET' && url.pathname === '/leaderboard') {
      const board = (url.searchParams.get('board') || 'networth') as Board;
      if (!['networth', 'compute', 'efficiency'].includes(board)) return send(res, 400, { error: 'invalid board' });
      const playerId = url.searchParams.get('playerId') || undefined;
      return send(res, 200, leaderboard(board, playerId));
    }

    if (req.method === 'POST' && url.pathname === '/scores') {
      if (!allowWrite(ip)) return send(res, 429, { error: 'rate limited' });
      const body = await readJson(req);
      const result = validateSubmission(body);
      if (!result.ok) return send(res, 400, { error: result.error });
      recordScore(result.sub);
      return send(res, 200, { ok: true });
    }

    return send(res, 404, { error: 'not found' });
  } catch (err) {
    return send(res, 400, { error: (err as Error).message });
  }
});

server.listen(PORT, () => {
  console.log(`GigaRack backend listening on http://localhost:${PORT}`);
});
