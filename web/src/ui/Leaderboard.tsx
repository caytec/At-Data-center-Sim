import { useEffect, useState } from 'react';
import { fetchLeaderboard, getPlayerId } from '../net/api';
import type { Board, LeaderboardEntry } from '../net/api';
import { compact } from './format';

const BOARDS: { id: Board; label: string; fmt: (v: number) => string }[] = [
  { id: 'networth', label: 'Net Worth', fmt: (v) => '$' + compact(v) },
  { id: 'compute', label: 'Compute', fmt: (v) => compact(v) + ' PF' },
  { id: 'efficiency', label: 'Margin', fmt: (v) => (v / 100).toFixed(1) + '%' },
];

export function Leaderboard({ handle }: { handle: string }) {
  const [board, setBoard] = useState<Board>('networth');
  const [rows, setRows] = useState<LeaderboardEntry[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    setRows(null);
    setError(false);
    fetchLeaderboard(board, getPlayerId())
      .then((r) => alive && setRows(r))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [board]);

  const fmt = BOARDS.find((b) => b.id === board)!.fmt;

  return (
    <section className="leaderboard">
      <div className="board-tabs">
        {BOARDS.map((b) => (
          <button key={b.id} className={board === b.id ? 'board-tab active' : 'board-tab'} onClick={() => setBoard(b.id)}>
            {b.label}
          </button>
        ))}
      </div>

      {error && (
        <p className="lb-empty">
          🌐 Global leaderboard offline. Start the backend (<code>npm run dev:server</code>) to compete live. Your
          scores are queued and will sync automatically.
        </p>
      )}
      {!error && rows === null && <p className="lb-empty">Loading the global rankings…</p>}
      {!error && rows?.length === 0 && <p className="lb-empty">Be the first on the board — you’re a pioneer.</p>}

      {rows && rows.length > 0 && (
        <ol className="lb-list">
          {rows.map((r) => (
            <li key={r.rank} className={'lb-row' + (r.isYou ? ' you' : '')}>
              <span className="lb-rank">#{r.rank}</span>
              <span className="lb-handle">
                {r.handle}
                {r.isYou && <em> (you)</em>}
                <span className={'lb-diff ' + r.difficulty}>{r.difficulty === 'realistic' ? 'R' : 'E'}</span>
              </span>
              <span className="lb-value">{fmt(r.value)}</span>
            </li>
          ))}
        </ol>
      )}
      <p className="lb-note">You are <b>{handle}</b>. Scores push automatically every ~30s.</p>
    </section>
  );
}
