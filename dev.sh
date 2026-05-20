#!/bin/bash
set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$ROOT_DIR/.dev.pids"

# Kill previous instances if any
if [ -f "$PID_FILE" ]; then
  echo "🛑 Stopping previous dev processes..."
  while read pid; do
    kill "$pid" 2>/dev/null || true
  done < "$PID_FILE"
  rm -f "$PID_FILE"
  sleep 1
fi

# Free up ports
for port in 3000 8080; do
  pid=$(lsof -ti :$port 2>/dev/null) || true
  if [ -n "$pid" ]; then
    echo "🔫 Freeing port $port (pid $pid)"
    kill -9 "$pid" 2>/dev/null || true
  fi
done

echo "🚀 Starting backend (air)..."
cd "$ROOT_DIR/services/api"
air &
echo $! >> "$PID_FILE"

echo "🚀 Starting frontend (npm run dev)..."
cd "$ROOT_DIR/apps/web"
npx next dev --webpack &
echo $! >> "$PID_FILE"

echo ""
echo "✅ Dev servers running!"
echo "   Backend:  http://localhost:8080"
echo "   Frontend: http://localhost:3000"
echo ""
echo "   To stop: run this script again, or: kill \$(cat $PID_FILE)"
echo ""

wait
