#!/usr/bin/env bash
#
# GigaRack one-shot deploy for a mikr.us (or any Debian/Ubuntu) VPS.
# Runs the whole game (web + leaderboard API) as ONE service on ONE port,
# with no root required (Node via nvm, process kept alive by pm2).
#
# Usage (in your VPS SSH session):
#   curl -fsSL https://raw.githubusercontent.com/caytec/At-Data-center-Sim/claude/ai-datacenter-simulator-teaching-o8udoe/deploy/mikrus.sh | bash -s -- <PORT>
#
# <PORT> = the internal port your mikr.us HTTPS web-domain forwards to
#          (see your mikr.us panel). Defaults to 3000 if omitted.
set -euo pipefail

PORT="${1:-${PORT:-3000}}"
REPO_URL="https://github.com/caytec/At-Data-center-Sim.git"
BRANCH="claude/ai-datacenter-simulator-teaching-o8udoe"
APP_DIR="$HOME/gigarack"

echo "==> GigaRack deploy starting (port ${PORT})"

# 1) Node 22 via nvm (user-level, no sudo) ----------------------------------
export NVM_DIR="$HOME/.nvm"
if [ ! -s "$NVM_DIR/nvm.sh" ]; then
  echo "==> Installing nvm (user-level Node manager)…"
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
fi
# shellcheck disable=SC1091
. "$NVM_DIR/nvm.sh"
nvm install 22 >/dev/null
nvm use 22 >/dev/null
echo "==> Using Node $(node -v)"

# 2) Get the code -----------------------------------------------------------
if [ -d "$APP_DIR/.git" ]; then
  echo "==> Updating existing checkout in ${APP_DIR}…"
  git -C "$APP_DIR" fetch --depth 1 origin "$BRANCH"
  git -C "$APP_DIR" checkout -B "$BRANCH" "origin/$BRANCH"
else
  echo "==> Cloning repo into ${APP_DIR}…"
  git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
fi
cd "$APP_DIR"

# 3) Install + build (single-service, same-origin API) ----------------------
echo "==> Installing dependencies (npm ci)…"
npm ci
echo "==> Building the web app…"
VITE_API_URL=same-origin npm run build:fast -w web

# 4) Run as a service -------------------------------------------------------
export PORT
export GIGARACK_STATIC="$APP_DIR/web/dist"

if ! command -v pm2 >/dev/null 2>&1; then
  echo "==> Installing pm2 (keeps the service alive)…"
  npm install -g pm2 >/dev/null 2>&1 || true
fi

if command -v pm2 >/dev/null 2>&1; then
  pm2 delete gigarack >/dev/null 2>&1 || true
  pm2 start npm --name gigarack --cwd "$APP_DIR" -- run start -w server
  pm2 save >/dev/null 2>&1 || true
  RUNNER="pm2 (view logs: pm2 logs gigarack)"
else
  echo "==> pm2 unavailable; falling back to nohup."
  pkill -f "tsx src/index.ts" >/dev/null 2>&1 || true
  nohup npm run start -w server >"$HOME/gigarack.log" 2>&1 &
  RUNNER="nohup (log: ~/gigarack.log)"
fi

# 5) Health check -----------------------------------------------------------
echo "==> Waiting for the service to come up…"
ok=""
for _ in 1 2 3 4 5 6 7 8 9 10; do
  if curl -fsS "http://localhost:${PORT}/health" >/dev/null 2>&1; then ok=1; break; fi
  sleep 2
done

echo
if [ -n "$ok" ]; then
  echo "✅ GigaRack is running on port ${PORT}  [${RUNNER}]"
  echo "   → Point your mikr.us HTTPS web-domain at internal port ${PORT}."
  echo "   → Then open your domain in a browser to play."
else
  echo "⚠️  Service did not answer on port ${PORT} yet."
  echo "   Check logs:  pm2 logs gigarack   (or)   tail -f ~/gigarack.log"
fi
echo "   Re-run this script anytime to update to the latest version."
