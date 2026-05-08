#!/bin/bash
# ============================================================
#  ShodanIntel — Start Script (Mac / Linux)
# ============================================================

PORT=8080
DIR="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "  ██████╗██╗  ██╗ ██████╗ ██████╗  █████╗ ███╗  ██╗"
echo "  ██╔═══╝██║  ██║██╔═══██╗██╔══██╗██╔══██╗████╗ ██║"
echo "  ███████╗███████║██║   ██║██║  ██║███████║██╔██╗██║"
echo "  ╚════██║██╔══██║██║   ██║██║  ██║██╔══██║██║╚████║"
echo "  ███████║██║  ██║╚██████╔╝██████╔╝██║  ██║██║ ╚███║"
echo "  ╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚══╝"
echo ""
echo "  INTEL // THREAT INTELLIGENCE DASHBOARD"
echo ""
echo "  ► Edit config.js to add your API keys before use"
echo "  ► Opening on http://localhost:$PORT"
echo ""

# Kill anything on the port already
lsof -ti:$PORT | xargs kill -9 2>/dev/null

cd "$DIR"

# Try Python 3 first, then Python 2, then Node
if command -v python3 &>/dev/null; then
  echo "  [✓] Starting with Python 3..."
  python3 -m http.server $PORT &
  SERVER_PID=$!
elif command -v python &>/dev/null; then
  echo "  [✓] Starting with Python 2..."
  python -m SimpleHTTPServer $PORT &
  SERVER_PID=$!
elif command -v npx &>/dev/null; then
  echo "  [✓] Starting with Node (npx serve)..."
  npx serve -p $PORT . &
  SERVER_PID=$!
else
  echo "  [✗] No server found. Install Python 3 or Node.js"
  exit 1
fi

sleep 1

# Open browser
if command -v open &>/dev/null; then
  open "http://localhost:$PORT"
elif command -v xdg-open &>/dev/null; then
  xdg-open "http://localhost:$PORT"
fi

echo "  Server running (PID $SERVER_PID). Press CTRL+C to stop."
echo ""

wait $SERVER_PID
