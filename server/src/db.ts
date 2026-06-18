/**
 * Tiny persistence layer over Node's built-in SQLite (node:sqlite, Node >=22).
 * No native npm dependency required.
 */
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Board, ScoreSubmission } from './validate.ts';

const DB_PATH = process.env.GIGARACK_DB || './data/scores.db';
mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new DatabaseSync(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS scores (
    playerId   TEXT NOT NULL,
    board      TEXT NOT NULL,
    handle     TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    value      REAL NOT NULL,
    hoursPlayed REAL NOT NULL,
    updatedAt  INTEGER NOT NULL,
    PRIMARY KEY (playerId, board)
  );
  CREATE INDEX IF NOT EXISTS idx_scores_board_value ON scores(board, value DESC);
`);

const upsertStmt = db.prepare(`
  INSERT INTO scores (playerId, board, handle, difficulty, value, hoursPlayed, updatedAt)
  VALUES (?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(playerId, board) DO UPDATE SET
    handle = excluded.handle,
    difficulty = excluded.difficulty,
    value = MAX(scores.value, excluded.value),
    hoursPlayed = excluded.hoursPlayed,
    updatedAt = excluded.updatedAt
`);

const topStmt = db.prepare(`
  SELECT playerId, handle, difficulty, value
  FROM scores
  WHERE board = ?
  ORDER BY value DESC, updatedAt ASC
  LIMIT ?
`);

const meStmt = db.prepare(`SELECT value, handle, difficulty FROM scores WHERE board = ? AND playerId = ?`);
const rankStmt = db.prepare(`SELECT COUNT(*) AS n FROM scores WHERE board = ? AND value > ?`);

export interface LeaderboardRow {
  rank: number;
  handle: string;
  value: number;
  difficulty: string;
  isYou?: boolean;
}

/** Keep only a player's best per board (MAX is enforced in the upsert). */
export function recordScore(sub: ScoreSubmission): void {
  upsertStmt.run(sub.playerId, sub.board, sub.handle, sub.difficulty, sub.value, sub.hoursPlayed, Date.now());
}

export function leaderboard(board: Board, playerId: string | undefined, limit = 50): LeaderboardRow[] {
  const top = topStmt.all(board, limit) as Array<{
    playerId: string;
    handle: string;
    difficulty: string;
    value: number;
  }>;

  const rows: LeaderboardRow[] = top.map((r, i) => ({
    rank: i + 1,
    handle: r.handle,
    value: r.value,
    difficulty: r.difficulty,
    isYou: playerId ? r.playerId === playerId : false,
  }));

  // If the requesting player isn't in the visible top-N, append their standing.
  if (playerId && !rows.some((r) => r.isYou)) {
    const me = meStmt.get(board, playerId) as { value: number; handle: string; difficulty: string } | undefined;
    if (me) {
      const ahead = (rankStmt.get(board, me.value) as { n: number }).n;
      rows.push({ rank: ahead + 1, handle: me.handle, value: me.value, difficulty: me.difficulty, isYou: true });
    }
  }

  return rows;
}
