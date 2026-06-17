import { useState } from 'react';
import { LESSONS } from '../data/lessons';
import type { Difficulty } from '../engine/types';

/** A progressively-unlocked glossary of every business lesson the player has met. */
export function Codex({ seen, difficulty }: { seen: string[]; difficulty: Difficulty }) {
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <section className="codex">
      <p className="codex-intro">
        Every concept you’ve lived in the game, in plain language. Unlocked: <b>{seen.length}</b> /{' '}
        {LESSONS.length}.
      </p>
      {LESSONS.map((l) => {
        const unlocked = seen.includes(l.id);
        const open = openId === l.id;
        return (
          <div key={l.id} className={'codex-item' + (unlocked ? '' : ' locked')}>
            <button className="codex-head" onClick={() => unlocked && setOpenId(open ? null : l.id)}>
              <span>{unlocked ? l.concept : '🔒 Locked'}</span>
              <span className="muted">{unlocked ? l.title : 'Keep playing to unlock'}</span>
            </button>
            {open && unlocked && (
              <p className="codex-body">{difficulty === 'realistic' ? l.bodyRealistic : l.bodyEasy}</p>
            )}
          </div>
        );
      })}
    </section>
  );
}
