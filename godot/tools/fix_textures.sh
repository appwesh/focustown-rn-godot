#!/bin/bash

# Fix texture imports for smaller PCK file size
# Run from godot/ directory: ./tools/fix_textures.sh

ASSETS_DIR="./assets"
COUNT=0

echo "=== Texture Import Fixer ==="
echo "Setting compress/mode=1 (Lossy) for smaller file size..."
echo ""

# Find all texture .import files and update them
find "$ASSETS_DIR" -name "*.tga.import" -o -name "*.png.import" -o -name "*.jpg.import" | while read -r file; do
    # Replace compress/mode=0 or compress/mode=2 with compress/mode=1
    if grep -q "compress/mode=" "$file"; then
        sed -i '' 's/compress\/mode=0/compress\/mode=1/g' "$file"
        sed -i '' 's/compress\/mode=2/compress\/mode=1/g' "$file"
        
        # Set lossy quality to 0.7 (70%)
        sed -i '' 's/compress\/lossy_quality=.*/compress\/lossy_quality=0.7/g' "$file"
        
        # Disable mipmaps to save space
        sed -i '' 's/mipmaps\/generate=true/mipmaps\/generate=false/g' "$file"
        
        COUNT=$((COUNT + 1))
        echo "Fixed: $file"
    fi
done

echo ""
echo "Done! Now reload Godot project to reimport textures."
echo "Project -> Reload Current Project"
