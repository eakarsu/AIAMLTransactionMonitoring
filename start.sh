#!/bin/bash
set -euo pipefail
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
[ -f "$PROJECT_DIR/.env" ] || { echo "ERROR: Missing .env; copy .env.example and configure it." >&2; exit 1; }
set -a
source "$PROJECT_DIR/.env"
set +a
export BACKEND_PORT="${BACKEND_PORT:-3069}"
export FRONTEND_PORT="${FRONTEND_PORT:-3068}"
export REACT_APP_API_BASE="${REACT_APP_API_BASE:-http://127.0.0.1:$BACKEND_PORT/api}"
fail(){ echo "ERROR: $*" >&2; exit 1; }
port_free(){ ! lsof -ti ":$1" >/dev/null 2>&1; }
echo "AI AML Transaction Monitoring"
echo "Runtime startup validates configuration, applies tracked migrations, and provisions the configured administrator."
command -v node >/dev/null 2>&1||fail "Node.js is required."
[ -d "$PROJECT_DIR/backend/node_modules" ]||fail "Backend dependencies are missing; install them explicitly."
[ -d "$PROJECT_DIR/frontend/node_modules" ]||fail "Frontend dependencies are missing; install them explicitly."
[ -n "${OPENROUTER_API_KEY:-}" ]||fail "OPENROUTER_API_KEY is required."
[ -n "${OPENROUTER_MODEL:-}" ]||fail "OPENROUTER_MODEL is required."
[ "${OPENROUTER_BASE_URL:-}" = "https://openrouter.ai/api/v1" ]||fail "OPENROUTER_BASE_URL must be https://openrouter.ai/api/v1."
port_free "$BACKEND_PORT"||fail "Backend port $BACKEND_PORT is already in use."
port_free "$FRONTEND_PORT"||fail "Frontend port $FRONTEND_PORT is already in use."
if [ "${MIGRATE_ON_START:-false}" = true ]; then
  case "${ALLOW_SCHEMA_MIGRATION:-}" in 1|true) ;; *) fail "ALLOW_SCHEMA_MIGRATION=1 or true is required for startup migration.";; esac
  (cd "$PROJECT_DIR/backend" && npm run migrate)
fi
(cd "$PROJECT_DIR/backend" && npm run create-admin)
cleanup(){ trap - INT TERM EXIT; [ -n "${BACKEND_PID:-}" ]&&kill "$BACKEND_PID" 2>/dev/null||true; [ -n "${FRONTEND_PID:-}" ]&&kill "$FRONTEND_PID" 2>/dev/null||true; }
trap cleanup INT TERM EXIT
(cd "$PROJECT_DIR/backend"&&node server.js)& BACKEND_PID=$!
(cd "$PROJECT_DIR/frontend"&&BROWSER=none PORT="$FRONTEND_PORT" npm start)& FRONTEND_PID=$!
echo "Frontend: http://localhost:$FRONTEND_PORT"
echo "Backend:  http://localhost:$BACKEND_PORT"
wait "$BACKEND_PID" "$FRONTEND_PID"
