#!/bin/bash
set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$ROOT_DIR/.dev.pids"

# Kill previous instances from pid file
if [ -f "$PID_FILE" ]; then
  echo "Stopping previous dev processes..."
  while IFS= read -r pid; do
    kill "$pid" 2>/dev/null || true
  done < "$PID_FILE"
  rm -f "$PID_FILE"
fi

# Kill any stray next dev / go run processes from this project
pkill -f "next dev" 2>/dev/null || true
pkill -f "go run ./cmd/main.go" 2>/dev/null || true
pkill -f "air$" 2>/dev/null || true
sleep 1

# Free up ports (belt-and-suspenders)
for port in 3000 3001 8080; do
  while true; do
    pid=$(lsof -ti tcp:"$port" 2>/dev/null) || true
    [ -z "$pid" ] && break
    echo "Freeing port $port (pid $pid)"
    kill -9 "$pid" 2>/dev/null || true
    sleep 0.3
  done
done

# Start shared infra (postgres + redis) via docker if not running
if ! docker compose ps postgres 2>/dev/null | grep -q "Up"; then
  echo "Starting postgres & redis via docker..."
  docker compose up -d postgres redis
fi

echo "Starting backend..."
cd "$ROOT_DIR/services/api"
if command -v air &>/dev/null; then
  air &
else
  go run ./cmd/main.go &
fi
echo $! >> "$PID_FILE"

echo "Starting frontend (next dev)..."
cd "$ROOT_DIR/apps/web"
npm run dev &
echo $! >> "$PID_FILE"

echo ""
echo "Dev servers running!"
echo "  Backend:  http://localhost:8080"
echo "  Frontend: http://localhost:3000"
echo ""
echo "To stop: run this script again, or: kill \$(cat $PID_FILE)"
echo ""

wait
