#!/bin/bash
set -euo pipefail
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
export BACKEND_PORT="${BACKEND_PORT:-3069}"
export FRONTEND_PORT="${FRONTEND_PORT:-3068}"
fail(){ echo "ERROR: $*" >&2; exit 1; }
port_free(){ ! lsof -ti ":$1" >/dev/null 2>&1; }
echo "AI AML Transaction Monitoring"
echo "Read-only startup preflight; migrations, admin provisioning and demo data are separate commands."
command -v node >/dev/null 2>&1||fail "Node.js is required."
[ -d "$PROJECT_DIR/backend/node_modules" ]||fail "Backend dependencies are missing; install them explicitly."
[ -d "$PROJECT_DIR/frontend/node_modules" ]||fail "Frontend dependencies are missing; install them explicitly."
port_free "$BACKEND_PORT"||fail "Backend port $BACKEND_PORT is already in use."
port_free "$FRONTEND_PORT"||fail "Frontend port $FRONTEND_PORT is already in use."
cleanup(){ trap - INT TERM EXIT; [ -n "${BACKEND_PID:-}" ]&&kill "$BACKEND_PID" 2>/dev/null||true; [ -n "${FRONTEND_PID:-}" ]&&kill "$FRONTEND_PID" 2>/dev/null||true; }
trap cleanup INT TERM EXIT
(cd "$PROJECT_DIR/backend"&&node server.js)& BACKEND_PID=$!
(cd "$PROJECT_DIR/frontend"&&BROWSER=none PORT="$FRONTEND_PORT" npm start)& FRONTEND_PID=$!
echo "Frontend: http://localhost:$FRONTEND_PORT"
echo "Backend:  http://localhost:$BACKEND_PORT"
wait "$BACKEND_PID" "$FRONTEND_PID"
