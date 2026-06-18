/**
 * Leaderboard + market-demand API client.
 *
 * The game is fully playable offline: if the backend is unreachable, score
 * submissions are queued in localStorage and retried later, and the leaderboard
 * falls back to whatever was last cached. The base URL is configurable via the
 * VITE_API_URL env var (defaults to a local dev server).
 */
import type { Difficulty } from '../engine/types';

/**
 * Backend base URL, from VITE_API_URL at build time:
 * - `"same-origin"` (or `"/"`) → call relative paths on the current origin. Use this
 *   when one server hosts BOTH the game and the API (single-service deploy, e.g. a VPS).
 * - a full URL (e.g. a Render URL) → call that origin.
 * - unset + dev → `http://localhost:8787` (local dev servers).
 * - unset + prod → no backend: every call short-circuits to offline behavior (e.g.
 *   GitHub Pages static hosting), avoiding mixed-content errors on https.
 */
const raw = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
const SAME_ORIGIN = raw === 'same-origin' || raw === '/';
const configuredUrl = SAME_ORIGIN ? '' : raw?.replace(/\/$/, '');
const API_BASE = SAME_ORIGIN ? '' : configuredUrl || (import.meta.env.DEV ? 'http://localhost:8787' : '');
const HAS_BACKEND = SAME_ORIGIN || Boolean(configuredUrl) || Boolean(import.meta.env.DEV);
const QUEUE_KEY = 'gigarack.scorequeue.v1';
const PLAYER_KEY = 'gigarack.playerid.v1';

export type Board = 'networth' | 'compute' | 'efficiency';

export interface ScoreSubmission {
  playerId: string;
  handle: string;
  difficulty: Difficulty;
  board: Board;
  value: number;
  hoursPlayed: number;
}

export interface LeaderboardEntry {
  rank: number;
  handle: string;
  value: number;
  difficulty: Difficulty;
  isYou?: boolean;
}

/** Stable anonymous player id, generated once and persisted. */
export function getPlayerId(): string {
  let id = localStorage.getItem(PLAYER_KEY);
  if (!id) {
    id = 'p_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(PLAYER_KEY, id);
  }
  return id;
}

function readQueue(): ScoreSubmission[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}
function writeQueue(q: ScoreSubmission[]): void {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q.slice(-20)));
}

async function postScore(sub: ScoreSubmission): Promise<boolean> {
  if (!HAS_BACKEND) throw new Error('no backend configured');
  const res = await fetch(`${API_BASE}/scores`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(sub),
  });
  if (!res.ok) {
    // 4xx (rejected/invalid) — drop it; 5xx/network — caller will re-queue.
    if (res.status >= 400 && res.status < 500) return true;
    throw new Error(`submit failed: ${res.status}`);
  }
  return true;
}

/** Submit a score; on network failure, queue it for later. Best-effort. */
export async function submitScore(sub: ScoreSubmission): Promise<{ online: boolean }> {
  try {
    await postScore(sub);
    return { online: true };
  } catch {
    const q = readQueue();
    q.push(sub);
    writeQueue(q);
    return { online: false };
  }
}

/** Try to flush any queued submissions. Call on app start / reconnect. */
export async function flushQueue(): Promise<void> {
  const q = readQueue();
  if (q.length === 0) return;
  const remaining: ScoreSubmission[] = [];
  for (const sub of q) {
    try {
      await postScore(sub);
    } catch {
      remaining.push(sub);
    }
  }
  writeQueue(remaining);
}

export async function fetchLeaderboard(board: Board, playerId: string): Promise<LeaderboardEntry[]> {
  if (!HAS_BACKEND) throw new Error('no backend configured');
  const res = await fetch(`${API_BASE}/leaderboard?board=${board}&playerId=${encodeURIComponent(playerId)}`);
  if (!res.ok) throw new Error(`leaderboard failed: ${res.status}`);
  return (await res.json()) as LeaderboardEntry[];
}

/**
 * Fetch the global market demand index (0..~1.2). All players share it — a light
 * "we're in one market" signal. Falls back to a sensible default offline.
 */
export async function fetchDemand(): Promise<number | null> {
  if (!HAS_BACKEND) return null;
  try {
    const res = await fetch(`${API_BASE}/demand`);
    if (!res.ok) return null;
    const data = (await res.json()) as { demand: number };
    return data.demand;
  } catch {
    return null;
  }
}
