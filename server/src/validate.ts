/**
 * Anti-cheat "lite": reject scores that are impossible for the amount of time a
 * player claims to have played. This is intentionally generous — the goal is to
 * keep the board from being trivially spammed with absurd values, not to be a
 * cryptographic guarantee. A real deployment would also validate a signed,
 * server-replayed action log.
 */
export type Board = 'networth' | 'compute' | 'efficiency';
export type Difficulty = 'easy' | 'realistic';

export interface ScoreSubmission {
  playerId: string;
  handle: string;
  difficulty: Difficulty;
  board: Board;
  value: number;
  hoursPlayed: number;
}

const BOARDS: Board[] = ['networth', 'compute', 'efficiency'];

/** Plausible maximum value for a board given in-game hours played. */
function plausibleMax(board: Board, hoursPlayed: number): number {
  const h = Math.max(0, hoursPlayed) + 12; // floor so brand-new players are not zero-capped
  switch (board) {
    // Net worth can compound aggressively; allow a steep but bounded curve.
    case 'networth':
      return 80_000 * Math.pow(h, 2.4);
    // Compute (PFLOPs) grows with installed hardware.
    case 'compute':
      return 5 * Math.pow(h, 1.8);
    // Efficiency is gross-margin %, stored x100. Hard ceiling at 100%.
    case 'efficiency':
      return 100 * 100;
  }
}

export function validateSubmission(
  body: unknown,
): { ok: true; sub: ScoreSubmission } | { ok: false; error: string } {
  if (typeof body !== 'object' || body === null) return { ok: false, error: 'body must be an object' };
  const b = body as Record<string, unknown>;

  const { playerId, handle, difficulty, board, value, hoursPlayed } = b;

  if (typeof playerId !== 'string' || playerId.length < 3 || playerId.length > 64)
    return { ok: false, error: 'invalid playerId' };
  if (typeof handle !== 'string' || handle.length < 1 || handle.length > 24)
    return { ok: false, error: 'invalid handle' };
  if (difficulty !== 'easy' && difficulty !== 'realistic') return { ok: false, error: 'invalid difficulty' };
  if (typeof board !== 'string' || !BOARDS.includes(board as Board)) return { ok: false, error: 'invalid board' };
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return { ok: false, error: 'invalid value' };
  if (typeof hoursPlayed !== 'number' || !Number.isFinite(hoursPlayed) || hoursPlayed < 0)
    return { ok: false, error: 'invalid hoursPlayed' };

  const cap = plausibleMax(board as Board, hoursPlayed);
  if (value > cap)
    return { ok: false, error: `implausible value (>${Math.round(cap)} for ${hoursPlayed.toFixed(0)}h)` };

  // Sanitize handle: strip angle brackets to avoid HTML injection; keep spaces.
  const cleanHandle = handle.replace(/[<>]/g, '').trim().slice(0, 24) || 'Anonymous';

  return {
    ok: true,
    sub: {
      playerId,
      handle: cleanHandle,
      difficulty,
      board: board as Board,
      value,
      hoursPlayed,
    },
  };
}
