#!/bin/bash
# Quick upload Godot export to dev slot for testing
# Usage: ./tools/upload-dev.sh

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PCK_FILE="$PROJECT_ROOT/godot/export/main.pck"

if [ ! -f "$PCK_FILE" ]; then
    echo "❌ No PCK file found at $PCK_FILE"
    echo "Export from Godot first: Project → Export → iOS → Export PCK/ZIP"
    exit 1
fi

echo "📦 Uploading to dev slot..."
wrangler r2 object put apptowns/dev/main.pck --file "$PCK_FILE" --remote

echo ""
echo "✅ Done! Dev URL: https://pub-00e39c5ed81d4d70bfdb1f3408768872.r2.dev/dev/main.pck"
echo ""
echo "Clear app cache to see changes (or reinstall app)"

