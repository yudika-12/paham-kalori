#!/usr/bin/env bash
# Dev runner: jalankan backend & frontend untuk pengembangan lokal.
# Database memakai Neon (via .env / .env.local), bukan PostgreSQL lokal.
set -e
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

# Buka browser saat frontend :3000 sudah siap (background).
node backend/scripts/open-browser.js &
OPEN_PID=$!

# Jalankan server di foreground; -k agar browser tidak menggagalkan server.
concurrently -k -n api,web -c yellow,cyan \
  "npm run dev -w backend" \
  "npm run dev -w frontend"

kill "$OPEN_PID" 2>/dev/null || true