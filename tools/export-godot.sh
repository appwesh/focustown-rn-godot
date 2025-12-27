#!/bin/bash
#
# Export Godot project as PCK for React Native embedding
#
# Usage:
#   ./tools/export-godot.sh [ios|android|all]
#
# Prerequisites:
#   - Godot 4.5 installed and available in PATH as 'godot'
#   - Or set GODOT_EDITOR environment variable to your Godot executable
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
GODOT_DIR="$PROJECT_ROOT/godot"
GODOT="${GODOT_EDITOR:-/Applications/Godot.app/Contents/MacOS/Godot}"

PLATFORM="${1:-all}"

echo "=== TalkTown Godot Export ==="
echo "Project: $GODOT_DIR"
echo "Godot: $GODOT"
echo "Platform: $PLATFORM"
echo ""

# Create export directory
mkdir -p "$GODOT_DIR/export"

export_ios() {
    echo "Exporting for iOS..."
    "$GODOT" --headless --path "$GODOT_DIR" --export-pack "iOS" "$GODOT_DIR/export/main.pck"
    
    # Copy to iOS bundle location (must be inside talktown/ folder for Xcode)
    if [ -d "$PROJECT_ROOT/apps/mobile/ios/talktown" ]; then
        cp "$GODOT_DIR/export/main.pck" "$PROJECT_ROOT/apps/mobile/ios/talktown/main.pck"
        echo "Copied main.pck to apps/mobile/ios/talktown/"
    fi
    
    echo "iOS export complete: $GODOT_DIR/export/main.pck"
}

export_android() {
    echo "Exporting for Android..."
    "$GODOT" --headless --path "$GODOT_DIR" --export-pack "Android" "$GODOT_DIR/export/main.pck"
    
    # Copy to Android assets location (after prebuild)
    if [ -d "$PROJECT_ROOT/apps/mobile/android/app/src/main/assets" ]; then
        mkdir -p "$PROJECT_ROOT/apps/mobile/android/app/src/main/assets/main"
        # For Android, we need to extract PCK contents or use --path /main approach
        cp "$GODOT_DIR/export/main.pck" "$PROJECT_ROOT/apps/mobile/android/app/src/main/assets/"
        echo "Copied main.pck to apps/mobile/android/app/src/main/assets/"
    fi
    
    echo "Android export complete: $GODOT_DIR/export/main.pck"
}

case "$PLATFORM" in
    ios)
        export_ios
        ;;
    android)
        export_android
        ;;
    all)
        export_ios
        export_android
        ;;
    *)
        echo "Unknown platform: $PLATFORM"
        echo "Usage: $0 [ios|android|all]"
        exit 1
        ;;
esac

echo ""
echo "=== Export Complete ==="
echo ""
echo "Next steps:"
echo "  cd apps/mobile && npx expo run:ios"

