import { describe, expect, it } from 'vitest';
import { computePnL, costOfNext, netWorth, HOURS_PER_YEAR } from '../economics';
import { buy, createGame, simulateOffline, takeLoan, tick } from '../state';
import type { GameState } from '../types';

/**
 * Golden-number tests. These pin the economic model to specific, hand-checked
 * values so balance changes are deliberate and the "realism" can't silently
 * drift. If you intentionally retune the numbers, update the expectations here.
 */

describe('costOfNext', () => {
  it('applies geometric cost growth', () => {
    expect(costOfNext('rented-gpu', 0)).toBe(1_500);
    // 1500 * 1.1^1 = 1650
    expect(costOfNext('rented-gpu', 1)).toBe(1_650);
    // 1500 * 1.1^2 = 1815
    expect(costOfNext('rented-gpu', 2)).toBe(1_815);
  });
});

describe('starting state', () => {
  it('seeds cash by difficulty', () => {
    expect(createGame('alice', 'easy').cash).toBe(7_500);
    expect(createGame('bob', 'realistic').cash).toBe(5_000);
  });
});

describe('computePnL — one rented GPU (realistic)', () => {
  // Hand-derived expectations:
  //   GPU: 0.7 kW, $1.4/hr at 100%, PUE 1.6, $0.10/kWh, idle fraction 0.4
  //   demand 0.75, no power/ops constraints => utilization = 0.75
  //   revenue = 1.4 * 0.75 = 1.05 /hr
  //   effPowerKW = 0.7 * (0.4 + 0.6*0.75) = 0.7 * 0.85 = 0.595
  //   power cost = 0.595 * 1.6 * 0.10 = 0.0952 /hr
  //   depreciation = 1500 / 8760 = 0.171232.. /hr
  let state: GameState;
  const pnl = () => computePnL(state, 0.75);

  it('produces the expected P&L lines', () => {
    state = createGame('t', 'realistic');
    const r = buy(state, 'rented-gpu');
    expect(r.ok).toBe(true);
    state = r.state;

    const p = pnl();
    expect(p.utilization).toBeCloseTo(0.75, 6);
    expect(p.revenuePerHour).toBeCloseTo(1.05, 6);
    expect(p.powerCostPerHour).toBeCloseTo(0.0952, 6);
    expect(p.depreciationPerHour).toBeCloseTo(1500 / HOURS_PER_YEAR, 6);
    expect(p.pue).toBe(1.6);
    expect(p.gpuCount).toBe(1);
    // EBIT = 1.05 - 0.0952 - maintenance(0.03*bookValue/yr) - depreciation
    // bookValue = 1500 (no depreciation accrued yet), maintenance = 0.03*1500/8760 = 0.005137
    const maintenance = (0.03 * 1500) / HOURS_PER_YEAR;
    const dep = 1500 / HOURS_PER_YEAR;
    expect(p.opexPerHour).toBeCloseTo(maintenance, 6);
    expect(p.ebitPerHour).toBeCloseTo(1.05 - 0.0952 - maintenance - dep, 6);
    expect(p.netPerHour).toBeCloseTo(p.ebitPerHour, 6); // no loans
  });

  it('easy mode hides depreciation and is cheaper to run', () => {
    state = createGame('t', 'easy');
    state = buy(state, 'rented-gpu').state;
    const p = computePnL(state, 0.9);
    expect(p.depreciationPerHour).toBe(0);
    // demand 0.9, util 0.9, revenue = 1.4*0.9 = 1.26
    expect(p.revenuePerHour).toBeCloseTo(1.26, 6);
  });
});

describe('constraints throttle utilization', () => {
  it('power capacity caps utilization', () => {
    let state = createGame('t', 'realistic');
    state.cash = 1e9; // fund the scenario; affordability is covered elsewhere
    // Base capacity is 5 kW. Buy 10 GPUs => 7 kW installed > 5 kW.
    for (let i = 0; i < 10; i++) state = buy(state, 'rented-gpu').state;
    const p = computePnL(state, 1);
    // powerFactor = 5 / 7 ≈ 0.714, util = 1 * 0.714 * opsFactor(=1, ops cap 20 >=10)
    expect(p.totalPowerKW).toBeCloseTo(7, 6);
    expect(p.utilization).toBeCloseTo(5 / 7, 5);
  });

  it('buying power capacity relieves the throttle', () => {
    let state = createGame('t', 'realistic');
    state.cash = 1e9;
    for (let i = 0; i < 10; i++) state = buy(state, 'rented-gpu').state;
    state = buy(state, 'circuit').state; // +10 kW => 15 kW capacity
    const p = computePnL(state, 1);
    expect(p.powerCapacityKW).toBe(15);
    expect(p.utilization).toBeCloseTo(1, 6);
  });
});

describe('cooling lowers PUE', () => {
  it('best cooling component sets the PUE', () => {
    let state = createGame('t', 'realistic');
    state.cash = 1e9;
    state = buy(state, 'rented-gpu').state;
    expect(computePnL(state, 0.75).pue).toBe(1.6);
    state = buy(state, 'fans').state;
    expect(computePnL(state, 0.75).pue).toBe(1.5);
  });
});

describe('tier gating', () => {
  it('blocks components above current tier', () => {
    const state = createGame('t', 'realistic');
    const r = buy(state, 'h100-node'); // unlockTier 3, player at tier 1
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/locked/i);
  });
});

describe('net worth and tier progression', () => {
  it('advances tier when net worth crosses a threshold', () => {
    let state = createGame('t', 'realistic');
    state.cash = 20_000; // above tier 2 requirement (15k)
    const r = tick(state, 0.0001, 0.75); // tiny tick just to trigger progression
    expect(r.state.tier).toBe(2);
    expect(r.newLessons).toContain('capex-vs-opex');
  });

  it('netWorth = cash + book value − debt', () => {
    let state = createGame('t', 'realistic'); // 5000 cash
    state = buy(state, 'rented-gpu').state; // -1500 cash, +1500 book
    expect(netWorth(state)).toBeCloseTo(5000, 6); // unchanged: cash 3500 + book 1500
  });
});

describe('financing', () => {
  it('requires realistic mode and tier 5', () => {
    let state = createGame('t', 'easy');
    expect(takeLoan(state, 1000).ok).toBe(false);
    state = createGame('t', 'realistic');
    expect(takeLoan(state, 1000).ok).toBe(false); // tier 1
    state.tier = 5;
    const r = takeLoan(state, 100_000);
    expect(r.ok).toBe(true);
    expect(r.state.cash).toBe(105_000);
    expect(r.state.loans[0].principal).toBe(100_000);
  });

  it('loan interest reduces net cash flow', () => {
    let state = createGame('t', 'realistic');
    state.tier = 5;
    state = buy(state, 'rented-gpu').state;
    const before = computePnL(state, 0.75).netPerHour;
    state = takeLoan(state, 100_000).state;
    const after = computePnL(state, 0.75).netPerHour;
    const expectedInterest = (100_000 * 0.12) / HOURS_PER_YEAR;
    expect(before - after).toBeCloseTo(expectedInterest, 6);
  });
});

describe('offline progress', () => {
  it('accrues capped earnings and stamps lastSeen', () => {
    let state = createGame('t', 'realistic');
    state = buy(state, 'rented-gpu').state;
    const cashBefore = state.cash;
    // 10 real minutes => 10 game hours at default 60x.
    const res = simulateOffline(state, 10 * 60 * 1000);
    expect(res.cappedHours).toBeCloseTo(10, 6);
    expect(res.earned).toBeGreaterThan(0);
    expect(res.state.cash).toBeCloseTo(cashBefore + res.earned, 6);
  });

  it('caps very long absences', () => {
    let state = createGame('t', 'realistic');
    state = buy(state, 'rented-gpu').state;
    const res = simulateOffline(state, 1000 * 60 * 60 * 1000); // 1000 hours real
    expect(res.cappedHours).toBe(16); // default cap
  });
});
