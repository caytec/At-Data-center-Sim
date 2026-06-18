# Deploying GigaRack for free

## 0. Deploy on your own VPS (e.g. mikr.us) — one paste, one service

Runs the **whole game + leaderboard as one service on one port** (no CORS, no
mixed-content), with no root needed (Node via nvm, kept alive by pm2).

In your VPS SSH session:

```bash
ssh -p 11187 frog@frog02.mikr.us        # your VPS login

# then on the VPS — replace <PORT> with the internal port your mikr.us
# HTTPS web-domain forwards to (see the mikr.us panel):
curl -fsSL https://raw.githubusercontent.com/caytec/At-Data-center-Sim/claude/ai-datacenter-simulator-teaching-o8udoe/deploy/mikrus.sh | bash -s -- <PORT>
```

The script clones the repo, builds the app (same-origin API), and starts it under
pm2 on `<PORT>`. Then point your mikr.us web-domain at `<PORT>` and open it in a browser.

- Update later: just re-run the same command.
- Logs: `pm2 logs gigarack`. Restart: `pm2 restart gigarack`.
- Auto-start on reboot (optional): `pm2 startup` then follow its printed command.
- The leaderboard DB lives at `server/data/scores.db` on the VPS (persists across restarts).

---

Two free pieces:

- **Frontend (the game):** a static PWA on **GitHub Pages** — fully automated by the
  included GitHub Actions workflow.
- **Backend (global leaderboard):** the Node service on **Render's free tier** — a few
  clicks to create from the included `render.yaml` blueprint.

The game is fully playable with **frontend only** (the leaderboard simply runs in
offline-fallback mode). Add the backend whenever you want the live global board.

---

## 1. Frontend → GitHub Pages

The workflow [`.github/workflows/deploy-pages.yml`](../.github/workflows/deploy-pages.yml)
builds `web/`, publishes it to a `gh-pages` branch, **and auto-enables GitHub Pages via
the Pages API** — no manual Settings toggle required.

1. **Run the workflow.** It runs automatically on push, or trigger it manually:
   GitHub → **Actions** → *Deploy PWA to GitHub Pages* → **Run workflow**.
2. Wait ~1 minute. Your game is live at:

   **https://caytec.github.io/At-Data-center-Sim/**

   (The workflow log prints the live URL as a notice.)

> ⚠️ **Private repo caveat:** GitHub Pages on a **private** repo requires a **paid**
> plan. On a **free** plan the auto-enable step emits a warning and the site won't
> serve until you make the repo **public** (Settings → General → Danger Zone → Change
> visibility). Once public, just re-run the workflow — everything else is automatic.

Open it on desktop and on your phone; "Add to Home Screen" installs it as an app.

> The build uses `VITE_BASE=/At-Data-center-Sim/` so all asset paths work under the
> project-site subpath. If you fork/rename the repo, update `VITE_BASE` in the workflow.

---

## 2. Backend → Render (free, optional, for the live leaderboard)

The blueprint [`render.yaml`](../render.yaml) defines a single free web service.

1. Create an account at <https://render.com> (free, no card).
2. **New + → Blueprint** → connect this GitHub repo → Render reads `render.yaml` and
   creates the **gigarack-api** service. Click **Apply**.
3. When it goes live, copy its URL, e.g. `https://gigarack-api.onrender.com`.
   Verify: open `…/health` → `{"ok":true}`.

### Wire the game to the live backend

4. GitHub → **Settings → Secrets and variables → Actions → Variables → New repository
   variable**: name `API_URL`, value = your Render URL (no trailing slash).
5. Re-run the *Deploy PWA to GitHub Pages* workflow (Actions → Run workflow).

The deployed game now talks to the live backend: the **Ranks** tab shows **● live** and
the global leaderboard, and scores submit in real time.

> **Free-tier caveats:** the Render service sleeps after ~15 min idle (first request
> then cold-starts ~50s), and its disk is ephemeral, so the leaderboard resets on each
> redeploy. The client tolerates all of this (offline fallback + queued submissions).
> For persistence, attach a Render Disk and set `GIGARACK_DB` to a path on it.

---

## Quick verification

```bash
# Backend (once deployed)
curl https://gigarack-api.onrender.com/health      # {"ok":true}
curl https://gigarack-api.onrender.com/demand      # {"demand":0.8x}

# Frontend: open the Pages URL, buy a GPU, watch the P&L move, check Ranks shows "live".
```

## Alternative hosts

- **Frontend** also deploys cleanly to Vercel / Netlify / Cloudflare Pages
  (build `web`, output `web/dist`, set `VITE_BASE=/` and `VITE_API_URL`).
- **Backend** runs on any Node 22+ host (Railway, Fly.io, a small VM):
  `npm install && npm run start -w server`, expose `PORT`.
