# GigaRack — AI Data Center Tycoon 🖥️⚡

> Build an AI data center from **one rented GPU** to a **global hyperscaler** — and
> learn **real business from total basics** by living it. Browser + mobile (PWA),
> idle/incremental, with a real global leaderboard.

GigaRack turns the actual economics of running AI compute into a game where the
fun loop **is a live profit-and-loss statement**. Players absorb gross margin,
CapEx vs OpEx, PUE efficiency, utilization, depreciation, leverage, and economies
of scale without realizing they're studying — because they're too busy getting rich.

It is a Progressive Web App: installable on a phone, works offline, and keeps
earning while you're away. A small backend powers a shared global leaderboard and a
market-demand index every player feels at once.

---

## Why this exists

The "data center tycoon" genre is full of shallow clickers. **None teach the real
unit economics of AI infrastructure.** GigaRack fills that gap: every number is
anchored to real 2024–2025 figures (see [`docs/ECONOMICS.md`](docs/ECONOMICS.md)),
and every milestone hands the player a plain-language business lesson tied to what
they just experienced.

Full game design: [`docs/DESIGN.md`](docs/DESIGN.md).

---

## Quick start

Requires **Node 22+** (the backend uses the built-in `node:sqlite`).

```bash
npm install            # installs web + server workspaces

# Terminal A — backend (leaderboard + market demand)
npm run dev:server     # http://localhost:8787

# Terminal B — game (PWA)
npm run dev:web        # http://localhost:5173
```

Open http://localhost:5173, pick a difficulty, and power on. Open it on your phone
(same network, via the LAN URL Vite prints) and "Add to Home Screen" to install.

### Other scripts

```bash
npm test               # run the economics-engine golden tests (Vitest)
npm run build          # type-check + production-build the PWA into web/dist
npm run preview        # preview the production build
```

---

## How it plays

- **Zero → hero** across 8 tiers: *The Closet → Garage Rack → Server Room → Data
  Hall → Financed Expansion → Hyperscale Campus → Multi-Region → IPO.*
- **Buy compute, power, cooling, and staff.** GPUs earn revenue; power burns cash;
  cooling lowers your PUE; staff and power capacity unlock higher utilization.
- **Two difficulty modes.** *Easy* hides depreciation/financing with friendly
  numbers; *Realistic* runs the full P&L with demand swings and loans.
- **Learn by doing.** Milestones pop a **lesson card**; everything you've learned
  lives in the **Codex**.
- **Compete.** Scores push to global leaderboards (Net Worth, Compute, Margin)
  every ~30s. Offline? Scores queue and sync when you reconnect.

---

## Architecture

Monorepo (npm workspaces).

```
web/      React + Vite + TypeScript PWA
  src/engine/   pure, framework-agnostic economics engine (the source of "realism")
  src/data/     tunable balance: components, tiers, lessons
  src/state/    live store, persistence, offline progress
  src/net/      leaderboard API client + offline submission queue
  src/ui/       dashboard (P&L), build panel, lessons, leaderboard
server/   Node + node:http + node:sqlite backend (ZERO runtime dependencies)
  src/index.ts  HTTP routes: /demand, /leaderboard, /scores, /health
  src/db.ts     SQLite persistence (best-score-per-board upsert)
  src/validate.ts  anti-cheat: rejects values implausible for time played
docs/     DESIGN.md (game design) + ECONOMICS.md (the model + real-world sources)
```

The **economics engine is pure TypeScript with no UI dependencies**, so it is unit
tested in isolation (`npm test`) and is the single source of truth for balance.
Golden-number tests pin the model so "realism" can't silently drift.

---

## API (backend)

| Method | Path                                   | Purpose                                   |
| ------ | -------------------------------------- | ----------------------------------------- |
| `GET`  | `/health`                              | Liveness check                            |
| `GET`  | `/demand`                              | Shared global market-demand index (0–1.05)|
| `GET`  | `/leaderboard?board=&playerId=`        | Top 50 + your standing (`networth`/`compute`/`efficiency`) |
| `POST` | `/scores`                              | Submit a score (validated, best-kept)     |

The client base URL is configurable via `VITE_API_URL` (see `web/.env.example`).
If the backend is unreachable, the game stays fully playable: demand falls back to
a baseline and score submissions queue locally.

---

## Deploying

- **Game (`web/`):** any static host (Vercel/Netlify/Cloudflare Pages/GitHub Pages).
  `npm run build -w web` → deploy `web/dist`. Set `VITE_API_URL` to your backend.
- **Backend (`server/`):** any Node 22+ host (Render/Railway/Fly/a small VM).
  `npm run start -w server`. Set `PORT` and a writable `GIGARACK_DB` path.

---

## Roadmap

Tiers 6–8 (hyperscale, multi-region, IPO/prestige) are wired as data and unlock
late-game components today; deepening them, plus guilds/seasons and a player-driven
compute market, are the next social layers. See [`docs/DESIGN.md`](docs/DESIGN.md).

## License

MIT.
