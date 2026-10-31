#!/usr/bin/env bash
# À lancer depuis ton terminal (iTerm, Terminal, onglet Cursor dédié) — pas comme tâche éphémère d’agent.
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
    sleep 0.4
  fi
}

free_port 3000
free_port 5173

exec yarn dev:all
