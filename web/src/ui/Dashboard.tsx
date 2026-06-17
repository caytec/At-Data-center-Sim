import type { GameState, PnL } from '../engine/types';
import { compact, money, pct, rate } from './format';

/**
 * The always-visible live income statement — the core "business from basics"
 * teaching surface. Every line is a real P&L concept the player can watch move.
 */
export function Dashboard({ state, pnl, demand }: { state: GameState; pnl: PnL; demand: number }) {
  const realistic = state.difficulty === 'realistic';
  return (
    <section className="dashboard">
      <h2 className="card-title">
        Income Statement <span className="muted">· per hour</span>
      </h2>

      <div className="pnl">
        <Line label="Revenue" value={rate(pnl.revenuePerHour)} kind="pos" hint="GPU-hours sold" />
        <Line label="− Power (COGS)" value={rate(pnl.powerCostPerHour)} kind="neg" hint={`PUE ${pnl.pue.toFixed(2)}`} />
        <Line label="− OpEx (staff, upkeep)" value={rate(pnl.opexPerHour)} kind="neg" />
        {realistic && <Line label="− Depreciation" value={rate(pnl.depreciationPerHour)} kind="neg" />}
        <Line label="= EBIT" value={rate(pnl.ebitPerHour)} kind={pnl.ebitPerHour >= 0 ? 'pos' : 'neg'} strong />
        {realistic && pnl.interestPerHour > 0 && (
          <Line label="− Interest" value={rate(pnl.interestPerHour)} kind="neg" />
        )}
        <Line
          label="= Net profit"
          value={rate(pnl.netPerHour)}
          kind={pnl.netPerHour >= 0 ? 'pos' : 'neg'}
          strong
        />
      </div>

      <div className="kpis">
        <Kpi label="Gross margin" value={pct(pnl.grossMarginPct)} good={pnl.grossMarginPct > 40} />
        <Kpi label="Utilization" value={pct(pnl.utilization * 100, 0)} good={pnl.utilization > 0.7} />
        <Kpi label="GPUs" value={compact(pnl.gpuCount)} />
        <Kpi label="Compute" value={`${compact(pnl.totalPflops)} PF`} />
        <Kpi label="Power" value={`${compact(pnl.totalPowerKW)} / ${compact(pnl.powerCapacityKW)} kW`} good={pnl.totalPowerKW <= pnl.powerCapacityKW} />
        <Kpi label="Demand" value={pct(demand * 100, 0)} good={demand > 0.7} />
        {realistic && <Kpi label="Book value" value={money(pnl.bookValue)} />}
        {realistic && <Kpi label="Debt" value={money(pnl.totalDebt)} good={pnl.totalDebt === 0} />}
      </div>
    </section>
  );
}

function Line({
  label,
  value,
  kind,
  strong,
  hint,
}: {
  label: string;
  value: string;
  kind: 'pos' | 'neg';
  strong?: boolean;
  hint?: string;
}) {
  return (
    <div className={'pnl-line' + (strong ? ' strong' : '')}>
      <span className="pnl-label">
        {label}
        {hint && <em className="pnl-hint"> {hint}</em>}
      </span>
      <span className={'pnl-value ' + kind}>{value}</span>
    </div>
  );
}

function Kpi({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className={'kpi' + (good === true ? ' good' : good === false ? ' bad' : '')}>
      <span className="kpi-value">{value}</span>
      <span className="kpi-label">{label}</span>
    </div>
  );
}
