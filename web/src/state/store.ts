/**
 * The live game store: owns the authoritative client GameState, runs the tick
 * loop, pulls market demand, surfaces lessons and offline earnings, and pushes
 * scores to the leaderboard. UI subscribes via the `useGame` hook.
 */
import { DIFFICULTY, computePnL } from '../engine/economics';
import { buy as buyAction, createGame, simulateOffline, takeLoan as loanAction, tick } from '../engine/state';
import type { Difficulty, GameState, PnL } from '../engine/types';
import { fetchDemand, flushQueue, getPlayerId, submitScore } from '../net/api';
import { clearSave, loadSave, writeSave } from './persistence';

/** Game-time speed: in-game hours simulated per real-world second. */
export const SPEED = 5;
const OFFLINE_MAX_REAL_HOURS = 12;
const TICK_MS = 1_000;
const DEMAND_REFRESH_MS = 30_000;
const SCORE_PUSH_MS = 30_000;
const SAVE_MS = 5_000;

export interface OfflineReport {
  earned: number;
  gameHours: number;
}

export interface Snapshot {
  state: GameState | null;
  pnl: PnL | null;
  demand: number;
  online: boolean;
  pendingLessons: string[];
  offline: OfflineReport | null;
}

type Listener = () => void;

class GameStore {
  private state: GameState | null = null;
  private pnl: PnL | null = null;
  private demand = DIFFICULTY.realistic.baselineDemand;
  private online = false;
  private pendingLessons: string[] = [];
  private offline: OfflineReport | null = null;

  private snapshot: Snapshot = {
    state: null,
    pnl: null,
    demand: this.demand,
    online: false,
    pendingLessons: [],
    offline: null,
  };
  private listeners = new Set<Listener>();
  private timers: number[] = [];
  private lastTick = 0;

  // ---- subscription (useSyncExternalStore) ----
  subscribe = (l: Listener): (() => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };
  getSnapshot = (): Snapshot => this.snapshot;

  private rebuild(): void {
    this.snapshot = {
      state: this.state,
      pnl: this.pnl,
      demand: this.demand,
      online: this.online,
      pendingLessons: this.pendingLessons,
      offline: this.offline,
    };
    this.listeners.forEach((l) => l());
  }

  private recompute(): void {
    if (this.state) this.pnl = computePnL(this.state, this.demand);
  }

  // ---- lifecycle ----
  init(): void {
    const saved = loadSave();
    if (saved) {
      this.demand = DIFFICULTY[saved.difficulty].baselineDemand;
      const realMsAway = Date.now() - saved.lastSeen;
      const res = simulateOffline(saved, realMsAway, {
        gameHoursPerRealHour: SPEED * 3600,
        maxHours: SPEED * 3600 * OFFLINE_MAX_REAL_HOURS,
      });
      this.state = res.state;
      // Only celebrate a genuine absence, not a quick refresh.
      if (realMsAway > 60_000 && res.earned > 0.5) {
        this.offline = { earned: res.earned, gameHours: res.cappedHours };
      }
      if (res.newLessons.length) this.pendingLessons = [...this.pendingLessons, ...res.newLessons];
      this.startLoops();
    }
    this.recompute();
    this.rebuild();
    flushQueue();
  }

  newGame(handle: string, difficulty: Difficulty): void {
    this.state = createGame(handle.trim() || 'Anonymous', difficulty);
    this.demand = DIFFICULTY[difficulty].baselineDemand;
    this.offline = null;
    this.pendingLessons = [];
    // Tier 1 lesson on first launch.
    this.pendingLessons.push('gross-margin');
    if (!this.state.seenLessons.includes('gross-margin')) this.state.seenLessons.push('gross-margin');
    writeSave(this.state);
    this.startLoops();
    this.recompute();
    this.rebuild();
  }

  hasSave(): boolean {
    return loadSave() !== null;
  }

  reset(): void {
    clearSave();
    this.stopLoops();
    this.state = null;
    this.pnl = null;
    this.offline = null;
    this.pendingLessons = [];
    this.rebuild();
  }

  private startLoops(): void {
    this.stopLoops();
    this.lastTick = performance.now();
    this.timers.push(window.setInterval(this.loop, TICK_MS));
    this.timers.push(window.setInterval(this.refreshDemand, DEMAND_REFRESH_MS));
    this.timers.push(window.setInterval(this.pushScores, SCORE_PUSH_MS));
    this.timers.push(window.setInterval(this.persist, SAVE_MS));
    this.refreshDemand();
    document.addEventListener('visibilitychange', this.persist);
  }
  private stopLoops(): void {
    this.timers.forEach((t) => clearInterval(t));
    this.timers = [];
    document.removeEventListener('visibilitychange', this.persist);
  }

  private loop = (): void => {
    if (!this.state) return;
    const now = performance.now();
    const dtSec = Math.min(5, (now - this.lastTick) / 1000); // clamp tab-throttle bursts
    this.lastTick = now;
    const res = tick(this.state, dtSec * SPEED, this.demand);
    this.state = res.state;
    if (res.newLessons.length) this.pendingLessons = [...this.pendingLessons, ...res.newLessons];
    this.recompute();
    this.rebuild();
  };

  private refreshDemand = async (): Promise<void> => {
    const d = await fetchDemand();
    if (d != null) {
      this.demand = d;
      this.online = true;
    } else if (this.state) {
      this.demand = DIFFICULTY[this.state.difficulty].baselineDemand;
      this.online = false;
    }
    this.recompute();
    this.rebuild();
  };

  private pushScores = async (): Promise<void> => {
    if (!this.state || !this.pnl) return;
    const base = {
      playerId: getPlayerId(),
      handle: this.state.handle,
      difficulty: this.state.difficulty,
      hoursPlayed: this.state.hoursPlayed,
    };
    const r1 = await submitScore({ ...base, board: 'networth', value: Math.round(this.pnl.netWorth) });
    await submitScore({ ...base, board: 'compute', value: Math.round(this.pnl.totalPflops) });
    await submitScore({ ...base, board: 'efficiency', value: Math.round(this.pnl.grossMarginPct * 100) });
    this.online = r1.online;
    this.rebuild();
  };

  private persist = (): void => {
    if (this.state) writeSave({ ...this.state, lastSeen: Date.now() });
  };

  // ---- actions ----
  buy(id: string): string | null {
    if (!this.state) return 'No game';
    const r = buyAction(this.state, id);
    if (!r.ok) return r.reason ?? 'Cannot buy';
    this.state = r.state;
    this.persist();
    this.recompute();
    this.rebuild();
    return null;
  }

  takeLoan(amount: number): string | null {
    if (!this.state) return 'No game';
    const r = loanAction(this.state, amount);
    if (!r.ok) return r.reason ?? 'Cannot borrow';
    this.state = r.state;
    this.persist();
    this.recompute();
    this.rebuild();
    return null;
  }

  dismissLesson(): void {
    this.pendingLessons = this.pendingLessons.slice(1);
    this.rebuild();
  }

  dismissOffline(): void {
    this.offline = null;
    this.rebuild();
  }
}

export const store = new GameStore();
