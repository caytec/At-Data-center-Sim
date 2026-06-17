/**
 * Core type definitions for the GigaRack economics engine.
 *
 * The engine is intentionally framework-agnostic (no React/DOM imports) so it can
 * be unit-tested in isolation and reused on a server. It is the single source of
 * truth for the game's "realistic" business simulation.
 */

export type Difficulty = 'easy' | 'realistic';

/**
 * A purchasable / upgradeable building block of the data center.
 * `kind` groups items by their economic role.
 */
export type ComponentKind =
  | 'gpu' // revenue-generating compute
  | 'cooling' // lowers PUE (power overhead)
  | 'power' // raises power capacity (kW headroom)
  | 'staff'; // raises ops capacity, costs salary

export interface ComponentDef {
  id: string;
  kind: ComponentKind;
  name: string;
  blurb: string;
  /** Up-front capital expenditure to buy one unit (USD). */
  capex: number;
  /** Cost growth per owned unit (geometric). 1.07 => +7% each unit. */
  costGrowth: number;
  /** Useful life in in-game hours, used to amortize CapEx into depreciation. */
  usefulLifeHours: number;

  // --- kind-specific economic effects (all optional) ---
  /** gpu: continuous power draw per unit, kilowatts. */
  powerKW?: number;
  /** gpu: gross revenue per unit per hour at 100% utilization (USD). */
  revenuePerHour?: number;
  /** gpu: compute throughput per unit (PFLOPs), for the "compute" leaderboard. */
  pflops?: number;
  /** cooling: target PUE this tier of cooling enables (e.g. 1.3). Lower is better. */
  enablesPUE?: number;
  /** power: kilowatts of power capacity added per unit. */
  powerCapacityKW?: number;
  /** staff: annual salary per unit (USD/yr), converted to hourly internally. */
  salaryPerYear?: number;
  /** staff: ops capacity (GPUs one staffer can keep running) per unit. */
  opsCapacity?: number;
  /** The progression tier at which this component becomes buyable. */
  unlockTier: number;
}

/** A milestone in the zero-to-hero progression. */
export interface TierDef {
  tier: number;
  name: string;
  blurb: string;
  /** Net worth (USD) required to advance into this tier. */
  netWorthRequired: number;
  /** Lesson card id surfaced when this tier is reached. */
  lessonId: string;
}

/** A plain-language business lesson surfaced at milestones / events. */
export interface LessonDef {
  id: string;
  concept: string;
  title: string;
  /** Body copy. `{ }` placeholders are filled from live game numbers when shown. */
  bodyEasy: string;
  bodyRealistic: string;
}

/** Outstanding financing. */
export interface Loan {
  principal: number;
  /** Annual interest rate, e.g. 0.12 for 12%. */
  rate: number;
}

/** The full serializable game state. */
export interface GameState {
  version: number;
  difficulty: Difficulty;
  handle: string;
  /** Liquid cash (USD). Can go negative briefly; bankruptcy if too negative. */
  cash: number;
  /** Owned count per component id. */
  owned: Record<string, number>;
  loans: Loan[];
  tier: number;
  /** Lesson ids already shown (so we don't repeat). */
  seenLessons: string[];
  /** Total in-game hours simulated. */
  hoursPlayed: number;
  /** Wall-clock ms timestamp of last save (for offline progress). */
  lastSeen: number;
  /** Cumulative CapEx ever spent — used for depreciation + net worth. */
  totalCapexSpent: number;
  /** Accumulated depreciation so far (book value reduction). */
  accumulatedDepreciation: number;
}

/** A computed snapshot of the business at the current instant (per-hour rates). */
export interface PnL {
  revenuePerHour: number;
  powerCostPerHour: number;
  opexPerHour: number;
  depreciationPerHour: number;
  interestPerHour: number;
  ebitPerHour: number;
  netPerHour: number;
  grossMarginPct: number;
  // Operational stats
  utilization: number;
  pue: number;
  totalPowerKW: number;
  powerCapacityKW: number;
  totalPflops: number;
  gpuCount: number;
  bookValue: number;
  netWorth: number;
  totalDebt: number;
}
