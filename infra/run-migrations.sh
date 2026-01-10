#!/bin/bash
set -e

# Migration runner for Switchboard
# Runs all SQL migrations in infra/migrations/ in order

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS_DIR="$SCRIPT_DIR/migrations"

if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL environment variable is not set"
  exit 1
fi

echo "Running migrations from $MIGRATIONS_DIR..."

for migration in $(ls "$MIGRATIONS_DIR"/*.sql 2>/dev/null | sort); do
  echo "Applying: $(basename "$migration")"
  psql "$DATABASE_URL" -f "$migration"
done

echo "Migrations complete."
