/**
 * Leaderboard + market-demand API client.
 *
 * The game is fully playable offline: if the backend is unreachable, score
 * submissions are queued in localStorage and retried later, and the leaderboard
 * falls back to whatever was last cached. The base URL is configurable via the
 * VITE_API_URL env var (defaults to a local dev server).
 */
import type { Difficulty } from '../engine/types';

const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || 'http://localhost:8787';
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
  const res = await fetch(`${API_URL}/scores`, {
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
  const res = await fetch(`${API_URL}/leaderboard?board=${board}&playerId=${encodeURIComponent(playerId)}`);
  if (!res.ok) throw new Error(`leaderboard failed: ${res.status}`);
  return (await res.json()) as LeaderboardEntry[];
}

/**
 * Fetch the global market demand index (0..~1.2). All players share it — a light
 * "we're in one market" signal. Falls back to a sensible default offline.
 */
export async function fetchDemand(): Promise<number | null> {
  try {
    const res = await fetch(`${API_URL}/demand`);
    if (!res.ok) return null;
    const data = (await res.json()) as { demand: number };
    return data.demand;
  } catch {
    return null;
  }
}
