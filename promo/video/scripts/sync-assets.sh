#!/usr/bin/env bash
# Copies captured footage, synthesized audio and fonts into public/ for Remotion.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p public/footage public/audio/sfx public/fonts
cp ../footage/*.mp4 public/footage/ 2>/dev/null || true
cp ../audio/music.wav public/audio/
cp ../audio/sfx/*.wav public/audio/sfx/
cp node_modules/@fontsource/bebas-neue/files/bebas-neue-latin-400-normal.woff2 public/fonts/
for w in 400 600 700 800; do cp node_modules/@fontsource/inter/files/inter-latin-$w-normal.woff2 public/fonts/; done
