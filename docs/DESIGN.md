# GigaRack — Game Design Document

> An educational idle/MMO where building an AI data center teaches real business
> from total basics. Browser + mobile (PWA), zero-to-hero, with a live global
> leaderboard.

---

## 1. Vision

**Pitch:** *Cookie Clicker meets a real income statement.* You start with one
rented GPU in a closet and grow into a hyperscaler. The catch — and the hook — is
that the game's core loop is an actual profit-and-loss statement. Players learn
gross margin, CapEx vs OpEx, PUE, leverage, and scale because those are the only
levers that make them money.

**Player promise:** "In one sitting you'll go from $5,000 and one GPU to running a
data center business — and you'll understand exactly why each decision made or lost
you money."

---

## 2. Market analysis (why this wins)

The existing genre is shallow. Market scan:

| Title (platform)                         | What it is                          | Gap                              |
| ---------------------------------------- | ----------------------------------- | -------------------------------- |
| *Idle Data Center Tycoon* (Android)      | Tap-to-grow server idler            | No real economics, no learning   |
| *DataCenter Idle: Server Tycoon* (Android)| Idle + lootboxes + leaderboard     | Cosmetic depth only              |
| *Server Farm Tycoon* (web)               | Garage-to-hyperscaler clicker       | No P&L, no teaching              |
| *Data Center Simulator* (Steam)          | Construction/management sim         | Heavyweight, desktop, not edu    |
| *Milky Way Idle*, *SimpleMMO* (web MMO)  | Deep idle MMOs (400k+ players)      | Not about business/data centers  |

**The open niche:** a genuinely *educational* AI-datacenter idler that is (a) light
enough for mobile/browser, (b) socially competitive (MMO leaderboard), and (c)
anchored in **real unit economics**. Idle-MMO patterns that demonstrably work —
offline progress, prestige loops, global leaderboards, a shared market — are proven;
we apply them to a subject (AI infrastructure) that is culturally hot in 2025 and
has never been gamified for learning.

---

## 3. Core loop

1. **Earn** — GPUs generate revenue each tick (utilization × price).
2. **Spend** — power, staff, maintenance, depreciation, interest erode it.
3. **Reinvest** — buy compute, power capacity, cooling, staff, or take a loan.
4. **Unlock** — crossing a net-worth threshold advances a tier and teaches a lesson.
5. **Compete** — scores push to the global leaderboard; come back to climb.

The full economic model is documented in [`ECONOMICS.md`](ECONOMICS.md).

---

## 4. Progression — zero to hero

Eight tiers, each gated on net worth, each delivering a lesson when reached:

| Tier | Name                | Unlocks                       | Lesson                  |
| ---- | ------------------- | ----------------------------- | ----------------------- |
| 1    | The Closet          | Rented GPU, fans, circuit     | Gross margin            |
| 2    | The Garage Rack     | (scale up)                    | CapEx vs OpEx           |
| 3    | Server Room         | Owned H100, technicians       | Fixed vs variable cost  |
| 4    | Data Hall           | Aisle containment (PUE 1.3)   | PUE / efficiency        |
| 5    | Financed Expansion  | Substation, **loans**         | Leverage / financing    |
| 6    | Hyperscale Campus   | GB200 racks, liquid cooling   | Economies of scale      |
| 7    | Multi-Region        | (roadmap: sites, SLAs)        | Diversification         |
| 8    | IPO                 | (roadmap: prestige reset)     | Equity & valuation      |

Tiers 1–5 are fully wired in the MVP; 6–8 unlock their components and stand as the
content/roadmap surface.

---

## 5. Teaching design

Grounded in serious-games research: lessons land when the learner has just
*experienced* the concept, and content must be recognizably useful and appropriately
challenging.

- **Live P&L dashboard** — always on screen; the primary teaching surface.
- **Lesson cards** — fire at milestones, written in two registers (Easy = intuitive,
  Realistic = precise terminology), with `{placeholders}` filled by the player's own
  live numbers ("your PUE is 1.30").
- **Codex** — a progressively-unlocked glossary of every concept met.
- **Difficulty as curriculum** — Easy introduces revenue-minus-cost cleanly;
  Realistic layers in depreciation, financing, and demand volatility.
- **(Roadmap) decision events** — e.g. a spot-power spike: throttle training jobs or
  eat the cost? — teaching trade-offs under uncertainty.

---

## 6. MMO / social layer

- **Global leaderboards:** Net Worth, Compute (PFLOPs), Efficiency (gross margin).
  Best-score-per-board, with the player's own standing always shown.
- **Shared market demand:** a single server-computed demand index every player
  experiences simultaneously — a light "one global market" feel that also drives
  utilization.
- **Anti-cheat lite:** the server rejects scores implausible for the player's
  reported play time (see `server/src/validate.ts`).
- **Resilience:** the game is fully playable offline; scores queue locally and sync
  on reconnect.
- **Roadmap:** accounts, guilds/alliances, competitive seasons, and a player-driven
  spot market for compute.

---

## 7. Technical architecture

- **Client:** React + Vite + TypeScript, shipped as a PWA (installable, offline via
  service worker). The **economics engine is pure TS with no UI deps**, unit-tested,
  and the single source of truth for balance. Balance is **data, not code**
  (`web/src/data/`).
- **Offline progress:** on load, elapsed wall-clock time is simulated forward (capped)
  and surfaced as a "while you were away" reward — the classic idle hook.
- **Server:** Node 22 with **zero runtime dependencies** (`node:http` + `node:sqlite`),
  exposing demand + leaderboard + score endpoints. Easy to run locally, cheap to host.

See the repo [`README.md`](../README.md) for run/deploy instructions and the API
table.

---

## 8. Monetization (future, non-predatory)

Education-first, so avoid pay-to-win. Candidates: cosmetic data-center skins, an
optional "campaign/course" pack with structured business lessons and certificates,
classroom/educator licensing, and a one-time "pro" unlock (extra leaderboards,
deeper analytics). No mechanics that sell progress over learning.

---

## 9. MVP scope (this iteration) — status

- [x] Pure-TS economics engine, 8 components, full P&L, Vitest golden tests
- [x] Easy + Realistic difficulty modes
- [x] Tiers 1–5 wired with unlock gating + lesson cards (6–8 as data)
- [x] P&L dashboard, build panel, offline-earnings modal, lessons + Codex
- [x] PWA (installable, offline, mobile-responsive)
- [x] Real backend: `/scores` (validated), `/leaderboard`, `/demand`
- [x] Docs: this design doc + the economics model
