#!/usr/bin/env bash
# Two-pass EBU R128 loudness normalisation of a rendered promo: -14 LUFS, -1.5 dBTP (YouTube/Instagram/TikTok safe).
# Video is stream-copied. Usage: scripts/master.sh in.mp4 out.mp4
set -euo pipefail
in="$1"; out="$2"
stats=$(ffmpeg -hide_banner -i "$in" -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
get() { echo "$stats" | python3 -c "import json,sys; print(json.load(sys.stdin)['$1'])"; }
ffmpeg -hide_banner -loglevel error -y -i "$in" -c:v copy \
  -af "loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=$(get input_i):measured_TP=$(get input_tp):measured_LRA=$(get input_lra):measured_thresh=$(get input_thresh):offset=$(get target_offset):linear=true,aresample=48000" \
  -c:a aac -b:a 256k -movflags +faststart "$out"
ffmpeg -hide_banner -i "$out" -af ebur128=peak=true -f null - 2>&1 | grep -A16 Summary | grep -E "I:|Peak:"
