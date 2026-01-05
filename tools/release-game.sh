#!/bin/bash
set -e

# Release script for Godot game to Cloudflare R2
# Usage: ./tools/release-game.sh 1.0.0 [--remote]

VERSION=$1
REMOTE_FLAG=""
if [ "$2" = "--remote" ]; then
    REMOTE_FLAG="--remote"
fi

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
GODOT_DIR="$PROJECT_ROOT/godot"
MOBILE_DIR="$PROJECT_ROOT/apps/mobile"
EXPORT_DIR="$GODOT_DIR/export"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

if [ -z "$VERSION" ]; then
    echo -e "${RED}Error: Version required${NC}"
    echo "Usage: ./tools/release-game.sh 1.0.0 [--remote]"
    exit 1
fi

# Validate semantic version
if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo -e "${RED}Error: Invalid version format. Use semantic versioning (e.g., 1.0.0)${NC}"
    exit 1
fi

echo -e "${YELLOW}🎮 Releasing Talktown Game v$VERSION${NC}"
echo ""

# Step 1: Export Godot project
echo -e "${GREEN}Step 1: Exporting Godot project...${NC}"
mkdir -p "$EXPORT_DIR"

# Try to find Godot
GODOT=""
if command -v godot &> /dev/null; then
    GODOT="godot"
elif [ -d "/Applications/Godot.app" ]; then
    GODOT="/Applications/Godot.app/Contents/MacOS/Godot"
elif [ -d "/Applications/Godot_v4.4-stable.app" ]; then
    GODOT="/Applications/Godot_v4.4-stable.app/Contents/MacOS/Godot"
fi

if [ -z "$GODOT" ]; then
    echo -e "${RED}Error: Godot not found. Please install Godot 4.4+${NC}"
    exit 1
fi

"$GODOT" --headless --path "$GODOT_DIR" --export-pack "iOS" "$EXPORT_DIR/main.pck"
echo "Exported: $EXPORT_DIR/main.pck"

# Step 2: Upload to R2 (requires wrangler or aws cli configured)
echo ""
echo -e "${GREEN}Step 2: Upload to Cloudflare R2${NC}"

if command -v wrangler &> /dev/null; then
    # Using Wrangler
    wrangler r2 object put "apptowns/v$VERSION/main.pck" --file "$EXPORT_DIR/main.pck" $REMOTE_FLAG
    wrangler r2 object put "apptowns/latest/main.pck" --file "$EXPORT_DIR/main.pck" $REMOTE_FLAG
    
    # Update manifest
    MANIFEST=$(cat <<EOF
{
  "version": "$VERSION",
  "url": "https://pub-00e39c5ed81d4d70bfdb1f3408768872.r2.dev/v$VERSION/main.pck",
  "updated": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
)
    echo "$MANIFEST" > "$EXPORT_DIR/manifest.json"
    wrangler r2 object put "apptowns/manifest.json" --file "$EXPORT_DIR/manifest.json" $REMOTE_FLAG
    
    echo -e "${GREEN}✓ Uploaded to R2${NC}"
else
    echo -e "${YELLOW}Wrangler not installed. Manual upload required:${NC}"
    echo "  1. Go to Cloudflare R2 dashboard"
    echo "  2. Upload $EXPORT_DIR/main.pck to: v$VERSION/main.pck"
    echo "  3. Also upload to: latest/main.pck"
    echo ""
    echo "Or install wrangler: npm install -g wrangler"
fi

# Step 3: Update app version constant
echo ""
echo -e "${GREEN}Step 3: Updating app version...${NC}"

GAME_CONSTANTS="$MOBILE_DIR/constants/game.ts"
if [ -f "$GAME_CONSTANTS" ]; then
    sed -i '' "s/GAME_VERSION = '[^']*'/GAME_VERSION = '$VERSION'/" "$GAME_CONSTANTS"
    echo "Updated: $GAME_CONSTANTS"
fi

# Summary
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ Release v$VERSION complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "PCK URL: https://pub-00e39c5ed81d4d70bfdb1f3408768872.r2.dev/v$VERSION/main.pck"
echo ""
echo "Next steps:"
echo "  1. Commit the version bump: git add -A && git commit -m 'Release game v$VERSION'"
echo "  2. Tag the release: git tag game-v$VERSION"
echo "  3. Push: git push && git push --tags"

