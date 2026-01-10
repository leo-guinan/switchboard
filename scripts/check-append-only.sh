#!/bin/bash
#
# check-append-only.sh
# Validates that event files are only added, never modified or deleted.
# Usage: ./scripts/check-append-only.sh <base-ref>
# Example: ./scripts/check-append-only.sh origin/main

set -e

BASE_REF="${1:-origin/main}"

if [ -z "$1" ]; then
  echo "Usage: $0 <base-ref>"
  echo "Example: $0 origin/main"
  exit 1
fi

violations=()

while IFS=$'\t' read -r status filepath; do
  case "$filepath" in
    events/*)
      if [ "$status" = "M" ] || [ "$status" = "D" ]; then
        violations+=("$status	$filepath")
      fi
      ;;
  esac
done < <(git diff --name-status "$BASE_REF"..HEAD)

if [ ${#violations[@]} -gt 0 ]; then
  echo "ERROR: Append-only violation detected!"
  echo "Files under events/ must only be added, never modified or deleted."
  echo ""
  echo "Offending files:"
  for v in "${violations[@]}"; do
    echo "  $v"
  done
  exit 1
fi

echo "Append-only check passed. All event file changes are additions."
exit 0
