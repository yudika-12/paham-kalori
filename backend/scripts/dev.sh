#!/usr/bin/env bash
# Dev runner: siapkan DB, jalankan server, dan buka browser otomatis.
set -e
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

bash backend/scripts/pg.sh ensure
npm run db:push

# Buka browser saat frontend :3000 sudah siap (background, tanpa kunci proses lain).
node backend/scripts/open-browser.js &
OPEN_PID=$!

# Jalankan server di foreground; kebwa browser tidak menggugurkan server karena -k.
concurrently -k -n api,web -c yellow,cyan \
  "npm run dev -w backend" \
  "npm run dev -w frontend"

kill "$OPEN_PID" 2>/dev/null || true