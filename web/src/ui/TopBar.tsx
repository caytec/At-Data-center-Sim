import { TIERS } from '../data/tiers';
import type { GameState, PnL } from '../engine/types';
import { money } from './format';

export function TopBar({ state, pnl, online }: { state: GameState; pnl: PnL; online: boolean }) {
  const tier = TIERS.find((t) => t.tier === state.tier);
  const next = TIERS.find((t) => t.tier === state.tier + 1);
  const progress = next
    ? Math.max(0, Math.min(1, (pnl.netWorth - (tier?.netWorthRequired ?? 0)) / (next.netWorthRequired - (tier?.netWorthRequired ?? 0))))
    : 1;

  return (
    <header className="topbar">
      <div className="tb-row">
        <div className="tb-cash">
          <span className="tb-label">Cash</span>
          <strong className={pnl.netPerHour >= 0 ? 'pos' : 'neg'}>{money(state.cash)}</strong>
          <span className={'tb-rate ' + (pnl.netPerHour >= 0 ? 'pos' : 'neg')}>
            {pnl.netPerHour >= 0 ? '+' : ''}
            {money(pnl.netPerHour)}/hr
          </span>
        </div>
        <div className="tb-net">
          <span className="tb-label">Net worth</span>
          <strong>{money(pnl.netWorth)}</strong>
          <span className={'dot ' + (online ? 'on' : 'off')} title={online ? 'Online — global market live' : 'Offline'}>
            {online ? '● live' : '○ offline'}
          </span>
        </div>
      </div>
      <div className="tb-tier">
        <span className="tier-name">
          T{state.tier} · {tier?.name}
        </span>
        <div className="tier-bar">
          <div className="tier-fill" style={{ width: `${progress * 100}%` }} />
        </div>
        <span className="tier-next">{next ? `Next: ${next.name}` : 'MAX'}</span>
      </div>
    </header>
  );
}
