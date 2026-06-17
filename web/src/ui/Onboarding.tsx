import { useState } from 'react';
import type { Difficulty } from '../engine/types';
import { store } from '../state/store';

export function Onboarding() {
  const [handle, setHandle] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');

  function start() {
    store.newGame(handle, difficulty);
  }

  return (
    <div className="onboarding">
      <div className="onboard-card">
        <h1 className="logo">
          Giga<span>Rack</span>
        </h1>
        <p className="tagline">
          Build an AI data center from <b>one GPU</b> to a <b>hyperscaler</b>.
          <br />
          Learn real business — gross margin, PUE, leverage — by living it.
        </p>

        <label className="field">
          <span>Your operator handle</span>
          <input
            value={handle}
            maxLength={16}
            placeholder="e.g. NeonCompute"
            onChange={(e) => setHandle(e.target.value)}
          />
        </label>

        <div className="field">
          <span>Difficulty</span>
          <div className="diff-grid">
            <button
              className={difficulty === 'easy' ? 'diff active' : 'diff'}
              onClick={() => setDifficulty('easy')}
            >
              <b>Easy</b>
              <small>Friendly numbers. No depreciation or loans. Gentle lessons.</small>
            </button>
            <button
              className={difficulty === 'realistic' ? 'diff active' : 'diff'}
              onClick={() => setDifficulty('realistic')}
            >
              <b>Realistic</b>
              <small>Full P&amp;L: depreciation, financing, demand swings. Real terms.</small>
            </button>
          </div>
        </div>

        <button className="primary big" onClick={start}>
          Power on →
        </button>

        <p className="fineprint">Runs offline. Installable on your phone. Your save lives on this device.</p>
      </div>
    </div>
  );
}
