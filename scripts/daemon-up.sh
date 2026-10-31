#!/usr/bin/env bash
# Démarre API + Vite sous PM2 (survit à la fin d’une tâche agent / shell).
set -eu
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

free_port() {
  local port="$1"
  local pids
  pids=$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)
  if [ -n "$pids" ]; then
    # shellcheck disable=SC2086
    kill -TERM $pids 2>/dev/null || true
    sleep 0.5
  fi
}

free_port 3000
free_port 5173

PM2="${ROOT}/node_modules/.bin/pm2"
if [ ! -x "$PM2" ]; then
  echo "pm2 introuvable. Lance : yarn install" >&2
  exit 1
fi

"$PM2" delete chronologie-api chronologie-ui 2>/dev/null || true
exec "$PM2" start ecosystem.config.cjs
