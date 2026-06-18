/**
 * State lifecycle + player actions for the economics engine.
 *
 * Actions return a NEW GameState (no external mutation) so callers (the React
 * store, the server, tests) can reason about transitions cleanly.
 */
import { COMPONENTS_BY_ID } from '../data/components';
import { TIERS, tierForNetWorth } from '../data/tiers';
import { DIFFICULTY, computePnL, costOfNext, netWorth } from './economics';
import type { Difficulty, GameState } from './types';

export const SAVE_VERSION = 1;

export function createGame(handle: string, difficulty: Difficulty): GameState {
  return {
    version: SAVE_VERSION,
    difficulty,
    handle,
    cash: DIFFICULTY[difficulty].startingCash,
    owned: {},
    loans: [],
    tier: 1,
    seenLessons: [],
    hoursPlayed: 0,
    lastSeen: Date.now(),
    totalCapexSpent: 0,
    accumulatedDepreciation: 0,
  };
}

export interface BuyResult {
  state: GameState;
  ok: boolean;
  reason?: string;
}

/** Attempt to buy one unit of a component. Enforces tier gating and affordability. */
export function buy(state: GameState, componentId: string): BuyResult {
  const def = COMPONENTS_BY_ID[componentId];
  if (!def) return { state, ok: false, reason: 'Unknown component' };
  if (state.tier < def.unlockTier) return { state, ok: false, reason: 'Locked — advance tiers to unlock' };

  const owned = state.owned[componentId] ?? 0;
  const cost = costOfNext(componentId, owned);
  if (state.cash < cost) return { state, ok: false, reason: 'Not enough cash' };

  return {
    ok: true,
    state: {
      ...state,
      cash: state.cash - cost,
      owned: { ...state.owned, [componentId]: owned + 1 },
      totalCapexSpent: state.totalCapexSpent + cost,
    },
  };
}

/** Take a loan. Disabled outside full-accounting (realistic) difficulty. */
export function takeLoan(state: GameState, amount: number): BuyResult {
  const cfg = DIFFICULTY[state.difficulty];
  if (!cfg.fullAccounting) return { state, ok: false, reason: 'Financing unlocks in Realistic mode' };
  if (state.tier < 5) return { state, ok: false, reason: 'Financing unlocks at the Financed Expansion tier' };
  if (amount <= 0) return { state, ok: false, reason: 'Invalid amount' };

  return {
    ok: true,
    state: {
      ...state,
      cash: state.cash + amount,
      loans: [...state.loans, { principal: amount, rate: cfg.loanRate }],
    },
  };
}

export interface TickResult {
  state: GameState;
  /** Lesson ids newly triggered this tick (tier-ups), in order. */
  newLessons: string[];
}

/**
 * Advance the simulation by `dtHours` of in-game time at the given market demand.
 * Applies net cash flow, accrues depreciation, and handles tier progression.
 */
export function tick(state: GameState, dtHours: number, demandIndex: number): TickResult {
  if (dtHours <= 0) return { state, newLessons: [] };

  const pnl = computePnL(state, demandIndex);

  const cash = state.cash + pnl.netPerHour * dtHours;
  const accumulatedDepreciation = Math.min(
    state.totalCapexSpent,
    state.accumulatedDepreciation + pnl.depreciationPerHour * dtHours,
  );

  let next: GameState = {
    ...state,
    cash,
    accumulatedDepreciation,
    hoursPlayed: state.hoursPlayed + dtHours,
  };

  // Tier progression (can advance multiple tiers in one big offline tick).
  const newLessons: string[] = [];
  const reachedTier = tierForNetWorth(netWorth(next));
  if (reachedTier > next.tier) {
    for (let t = next.tier + 1; t <= reachedTier; t++) {
      const def = TIERS.find((d) => d.tier === t);
      if (def && !next.seenLessons.includes(def.lessonId)) {
        newLessons.push(def.lessonId);
      }
    }
    next = {
      ...next,
      tier: reachedTier,
      seenLessons: [...next.seenLessons, ...newLessons],
    };
  }

  return { state: next, newLessons };
}

/**
 * Run the simulation forward over a wall-clock gap (offline progress).
 * Demand is held at a representative constant; the elapsed time is capped so a
 * long absence can't trivialize the game.
 */
export function simulateOffline(
  state: GameState,
  realMsElapsed: number,
  opts: { maxHours?: number; gameHoursPerRealHour?: number } = {},
): { state: GameState; earned: number; cappedHours: number; newLessons: string[] } {
  const gameHoursPerRealHour = opts.gameHoursPerRealHour ?? 60; // 1 real min ~= 1 game hour
  const maxHours = opts.maxHours ?? 16;
  const rawGameHours = (realMsElapsed / 3_600_000) * gameHoursPerRealHour;
  const cappedHours = Math.max(0, Math.min(maxHours, rawGameHours));

  const cfg = DIFFICULTY[state.difficulty];
  const before = state.cash;
  const result = tick(state, cappedHours, cfg.baselineDemand);
  return {
    state: { ...result.state, lastSeen: Date.now() },
    earned: result.state.cash - before,
    cappedHours,
    newLessons: result.newLessons,
  };
}
