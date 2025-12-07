#!/bin/bash
# Package Lens extension for distribution (without assets/videos)

VERSION=$(grep '"version"' manifest.json | sed 's/.*"version": "\(.*\)".*/\1/')
OUTPUT="Lens-v${VERSION}.zip"

# Remove old zip if exists
rm -f "$OUTPUT"

# Create zip excluding unnecessary files
zip -r "$OUTPUT" . \
  -x "*.git*" \
  -x "*.env*" \
  -x "assets/*.mp4" \
  -x "assets/*.mov" \
  -x "assets/*.webm" \
  -x "assets/*.gif" \
  -x "package.sh" \
  -x "*.zip" \
  -x ".claude/*" \
  -x ".DS_Store"

echo "Created $OUTPUT"
