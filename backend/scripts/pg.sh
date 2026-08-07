#!/usr/bin/env bash
# Helper: local PostgreSQL (bundled via pgserver, no sudo needed).
#
# Usage:
#   ./scripts/pg.sh start   # start the server if not already running (idempotent)
#   ./scripts/pg.sh status  # show whether the server is reachable
#   ./scripts/pg.sh stop    # stop the server
#   ./scripts/pg.sh ensure  # start + create role/db (used by `npm run dev`)

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BIN="$ROOT/.pgvenv/lib/python3.12/site-packages/pgserver/pginstall/bin"
PGDATA="$ROOT/.pgdata"
LOGFILE="$PGDATA/pg.log"
PGPORT="${PGPORT:-5432}"
PGHOST="${PGHOST:-127.0.0.1}"

if [ ! -d "$BIN" ]; then
  echo "PostgreSQL binaries not found. Run: python3 -m venv .pgvenv && .pgvenv/bin/pip install pgserver" >&2
  exit 1
fi

start() {
  if "$BIN/pg_isready" -h "$PGHOST" -p "$PGPORT" >/dev/null 2>&1; then
    echo "PostgreSQL already running at $PGHOST:$PGPORT"
    return 0
  fi
  if [ ! -f "$PGDATA/PG_VERSION" ]; then
    echo "Initializing cluster at $PGDATA..."
    mkdir -p "$PGDATA"
    "$BIN/initdb" -D "$PGDATA" --auth=trust --username=postgres >/dev/null
  fi
  "$BIN/pg_ctl" -D "$PGDATA" -l "$LOGFILE" -o "-p $PGPORT -h $PGHOST" start
  sleep 2
  echo "PostgreSQL started at $PGHOST:$PGPORT"
}

ensure() {
  start
  "$BIN/psql" -h "$PGHOST" -p "$PGPORT" -U postgres -tc \
    "SELECT 1 FROM pg_roles WHERE rolname='paham'" | grep -q 1 || \
    "$BIN/psql" -h "$PGHOST" -p "$PGPORT" -U postgres -c \
      "CREATE USER paham WITH PASSWORD 'paham';"
  "$BIN/psql" -h "$PGHOST" -p "$PGPORT" -U postgres -lqt | cut -d '|' -f1 | grep -qw pahamkalori || \
    "$BIN/psql" -h "$PGHOST" -p "$PGPORT" -U postgres -c \
      "CREATE DATABASE pahamkalori OWNER paham;"
  echo "PostgreSQL ready (role=paham, db=pahamkalori)."
}

stop() {
  if [ -f "$PGDATA/postmaster.pid" ]; then
    "$BIN/pg_ctl" -D "$PGDATA" stop
    echo "PostgreSQL stopped."
  else
    echo "PostgreSQL not running."
  fi
}

case "${1:-ensure}" in
  start) start ;;
  ensure) ensure ;;
  status) "$BIN/pg_isready" -h "$PGHOST" -p "$PGPORT" && echo "OK" || exit 1 ;;
  stop) stop ;;
  *) echo "Unknown command: $1" >&2; exit 1 ;;
esac