import { useState } from 'react';
import { COMPONENTS } from '../data/components';
import { costOfNext } from '../engine/economics';
import type { ComponentKind, GameState, PnL } from '../engine/types';
import { store } from '../state/store';
import { compact, money } from './format';

const KIND_LABEL: Record<ComponentKind, string> = {
  gpu: 'Compute',
  cooling: 'Cooling · lowers PUE',
  power: 'Power capacity',
  staff: 'Staff · ops capacity',
};
const KIND_ORDER: ComponentKind[] = ['gpu', 'power', 'cooling', 'staff'];

export function BuildPanel({ state, pnl }: { state: GameState; pnl: PnL }) {
  const [toast, setToast] = useState<string | null>(null);

  function tryBuy(id: string) {
    const err = store.buy(id);
    if (err) flash(err);
  }
  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1600);
  }

  return (
    <section className="build">
      {KIND_ORDER.map((kind) => {
        const items = COMPONENTS.filter((c) => c.kind === kind);
        return (
          <div key={kind} className="build-group">
            <h3 className="group-title">{KIND_LABEL[kind]}</h3>
            {items.map((c) => {
              const owned = state.owned[c.id] ?? 0;
              const locked = state.tier < c.unlockTier;
              const cost = costOfNext(c.id, owned);
              const afford = state.cash >= cost;
              return (
                <button
                  key={c.id}
                  className={'item' + (locked ? ' locked' : '') + (!afford && !locked ? ' poor' : '')}
                  disabled={locked || !afford}
                  onClick={() => tryBuy(c.id)}
                >
                  <div className="item-main">
                    <span className="item-name">
                      {c.name}
                      {owned > 0 && <span className="owned">×{compact(owned)}</span>}
                    </span>
                    <span className="item-blurb">{locked ? `🔒 Unlocks at Tier ${c.unlockTier}` : c.blurb}</span>
                  </div>
                  <div className="item-buy">
                    <span className="cost">{c.capex === 0 ? 'Hire' : money(cost)}</span>
                    {c.kind === 'gpu' && <span className="item-meta">+{c.revenuePerHour}/hr</span>}
                    {c.kind === 'power' && <span className="item-meta">+{c.powerCapacityKW}kW</span>}
                    {c.kind === 'cooling' && <span className="item-meta">PUE {c.enablesPUE}</span>}
                    {c.kind === 'staff' && <span className="item-meta">+{c.opsCapacity} ops</span>}
                  </div>
                </button>
              );
            })}
          </div>
        );
      })}

      <Financing state={state} pnl={pnl} onError={flash} />

      {toast && <div className="toast">{toast}</div>}
    </section>
  );
}

function Financing({ state, pnl, onError }: { state: GameState; pnl: PnL; onError: (m: string) => void }) {
  const available = state.difficulty === 'realistic' && state.tier >= 5;
  const [amount, setAmount] = useState(100_000);
  if (!available) {
    return (
      <div className="build-group">
        <h3 className="group-title">Financing</h3>
        <p className="locked-note">
          🔒 Loans unlock at <b>Tier 5 · Financed Expansion</b> (Realistic mode). Borrow to grow faster — if your
          GPUs out-earn the interest.
        </p>
      </div>
    );
  }
  return (
    <div className="build-group">
      <h3 className="group-title">Financing · debt {money(pnl.totalDebt)}</h3>
      <div className="loan">
        <input
          type="range"
          min={50_000}
          max={5_000_000}
          step={50_000}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
        />
        <div className="loan-row">
          <span>
            Borrow <b>{money(amount)}</b> @ 12%/yr
          </span>
          <button
            className="primary"
            onClick={() => {
              const err = store.takeLoan(amount);
              if (err) onError(err);
            }}
          >
            Take loan
          </button>
        </div>
      </div>
    </div>
  );
}
