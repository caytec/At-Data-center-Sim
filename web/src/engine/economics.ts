/**
 * The economics engine: a deterministic, framework-agnostic simulation of an
 * AI data center's profit-and-loss. This module is the single source of truth
 * for the game's "realism" and is locked down by golden-number unit tests.
 *
 * All rates returned by `computePnL` are PER HOUR. The `tick` function scales
 * them by a delta-time in hours to advance the world.
 */
import { COMPONENTS, COMPONENTS_BY_ID } from '../data/components';
import type { Difficulty, GameState, PnL } from './types';

export const HOURS_PER_YEAR = 8_760;

/** Tunable economic constants, per difficulty. */
export interface DifficultyConfig {
  startingCash: number;
  pricePerKWh: number;
  basePUE: number;
  basePowerCapacityKW: number;
  baseOpsCapacity: number;
  maintenanceRatePerYear: number; // fraction of book value / yr
  loanRate: number; // annual interest
  idlePowerFraction: number; // fraction of full power an idle GPU still draws
  /** When false, depreciation and financing are hidden/disabled (beginner mode). */
  fullAccounting: boolean;
  /** Baseline market demand (0..1) when the server provides none. */
  baselineDemand: number;
}

export const DIFFICULTY: Record<Difficulty, DifficultyConfig> = {
  easy: {
    startingCash: 7_500,
    pricePerKWh: 0.08,
    basePUE: 1.6,
    basePowerCapacityKW: 5,
    baseOpsCapacity: 30,
    maintenanceRatePerYear: 0.01,
    loanRate: 0.08,
    idlePowerFraction: 0.3,
    fullAccounting: false,
    baselineDemand: 0.9,
  },
  realistic: {
    startingCash: 5_000,
    pricePerKWh: 0.1,
    basePUE: 1.6,
    basePowerCapacityKW: 5,
    baseOpsCapacity: 20,
    maintenanceRatePerYear: 0.03,
    loanRate: 0.12,
    idlePowerFraction: 0.4,
    fullAccounting: true,
    baselineDemand: 0.75,
  },
};

/** Price (USD) of the next unit of a component given how many are already owned. */
export function costOfNext(componentId: string, owned: number): number {
  const def = COMPONENTS_BY_ID[componentId];
  if (!def) return Infinity;
  return Math.round(def.capex * Math.pow(def.costGrowth, owned));
}

/** Current book value of owned assets (depreciated CapEx, floored at 0). */
export function bookValue(state: GameState): number {
  return Math.max(0, state.totalCapexSpent - state.accumulatedDepreciation);
}

export function totalDebt(state: GameState): number {
  return state.loans.reduce((sum, l) => sum + l.principal, 0);
}

/** Net worth = cash + book value of assets − outstanding debt. The headline score. */
export function netWorth(state: GameState): number {
  return state.cash + bookValue(state) - totalDebt(state);
}

/**
 * Compute a full instantaneous P&L snapshot (per-hour rates + operational stats)
 * for the given state and current market demand index (0..~1.2).
 */
export function computePnL(state: GameState, demandIndex: number): PnL {
  const cfg = DIFFICULTY[state.difficulty];
  const owned = state.owned;

  // --- Capacity & operational aggregates ---
  let installedPowerKW = 0;
  let powerCapacityKW = cfg.basePowerCapacityKW;
  let opsCapacity = cfg.baseOpsCapacity;
  let gpuCount = 0;
  let totalPflops = 0;
  let grossRevenuePerHourAtFull = 0;
  let staffSalariesPerYear = 0;
  let bestPUE = cfg.basePUE;
  let depreciationPerHour = 0;

  for (const def of COMPONENTS) {
    const n = owned[def.id] ?? 0;
    if (n <= 0) continue;

    if (def.kind === 'gpu') {
      installedPowerKW += n * (def.powerKW ?? 0);
      gpuCount += n;
      totalPflops += n * (def.pflops ?? 0);
      grossRevenuePerHourAtFull += n * (def.revenuePerHour ?? 0);
    } else if (def.kind === 'cooling') {
      if (def.enablesPUE != null) bestPUE = Math.min(bestPUE, def.enablesPUE);
    } else if (def.kind === 'power') {
      powerCapacityKW += n * (def.powerCapacityKW ?? 0);
    } else if (def.kind === 'staff') {
      opsCapacity += n * (def.opsCapacity ?? 0);
      staffSalariesPerYear += n * (def.salaryPerYear ?? 0);
    }

    // Depreciation accrues on every depreciable asset (CapEx / useful life).
    if (cfg.fullAccounting && def.capex > 0 && def.usefulLifeHours > 1) {
      depreciationPerHour += (n * def.capex) / def.usefulLifeHours;
    }
  }

  // --- Utilization: demand throttled by power and ops constraints ---
  const powerFactor = installedPowerKW > 0 ? Math.min(1, powerCapacityKW / installedPowerKW) : 1;
  const opsFactor = gpuCount > 0 ? Math.min(1, opsCapacity / gpuCount) : 1;
  const utilization = clamp(demandIndex * powerFactor * opsFactor, 0, 1);

  // --- Revenue ---
  const revenuePerHour = grossRevenuePerHourAtFull * utilization;

  // --- Power cost: idle GPUs still draw `idlePowerFraction` of full power ---
  const effectivePowerKW = installedPowerKW * (cfg.idlePowerFraction + (1 - cfg.idlePowerFraction) * utilization);
  const powerCostPerHour = effectivePowerKW * bestPUE * cfg.pricePerKWh;

  // --- OpEx: salaries + maintenance on book value ---
  const maintenancePerHour = (cfg.maintenanceRatePerYear * bookValue(state)) / HOURS_PER_YEAR;
  const opexPerHour = staffSalariesPerYear / HOURS_PER_YEAR + maintenancePerHour;

  // --- Interest ---
  const interestPerHour = cfg.fullAccounting
    ? state.loans.reduce((sum, l) => sum + (l.principal * l.rate) / HOURS_PER_YEAR, 0)
    : 0;

  const ebitPerHour = revenuePerHour - powerCostPerHour - opexPerHour - depreciationPerHour;
  const netPerHour = ebitPerHour - interestPerHour;
  const grossMarginPct =
    revenuePerHour > 0 ? ((revenuePerHour - powerCostPerHour - opexPerHour) / revenuePerHour) * 100 : 0;

  return {
    revenuePerHour,
    powerCostPerHour,
    opexPerHour,
    depreciationPerHour,
    interestPerHour,
    ebitPerHour,
    netPerHour,
    grossMarginPct,
    utilization,
    pue: bestPUE,
    totalPowerKW: installedPowerKW,
    powerCapacityKW,
    totalPflops,
    gpuCount,
    bookValue: bookValue(state),
    netWorth: netWorth(state),
    totalDebt: totalDebt(state),
  };
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}
