#!/bin/bash
# Simple script to start a local web server for this project

PORT=${1:-8000}

echo "Starting local web server on port $PORT..."
echo "Open your browser and go to: http://localhost:$PORT"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

cd "$(dirname "$0")"
python3 -m http.server $PORT

