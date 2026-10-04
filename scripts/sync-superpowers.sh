#!/bin/bash

# sync-superpowers.sh
# Pulls the upstream obra/superpowers skills into .claude/skills.
#
#   bash scripts/sync-superpowers.sh             # sync
#   bash scripts/sync-superpowers.sh --dry-run   # list what would change, write nothing

set -euo pipefail

REPO_URL="https://github.com/obra/superpowers.git"
DEST_DIR=".claude/skills"
TEMP_DIR=".tmp_superpowers"

# Upstream skills that duplicate an owned one (#155): the sync never re-adds them.
REMOVED_SKILLS=(test-driven-development systematic-debugging writing-plans)

DRY_RUN=""
case "${1:-}" in
  --dry-run|-n) DRY_RUN="--dry-run" ;;
  "") ;;
  *) echo "usage: $0 [--dry-run]" >&2; exit 2 ;;
esac

if ! ROOT=$(git rev-parse --show-toplevel 2>/dev/null); then
  echo "Error: run this script from inside the hacer repository." >&2
  exit 1
fi
cd "$ROOT"

# Skills HACER authored, or vendored and then edited here: the sync never touches them. The
# doc-path checks read the same list (ADR-0010), so a skill kept here is also checked there.
owned=$(node -p "require('./scripts/owned-skills.json').join(' ')")
read -r -a OWNED_SKILLS <<< "$owned"

EXCLUDES=()
for skill in "${OWNED_SKILLS[@]}" "${REMOVED_SKILLS[@]}"; do
  EXCLUDES+=(--exclude="/$skill/")
done

mkdir -p "$DEST_DIR"
rm -rf "$TEMP_DIR"
trap 'rm -rf "$TEMP_DIR"' EXIT

echo "Cloning $REPO_URL..."
git clone --quiet --depth 1 "$REPO_URL" "$TEMP_DIR"

echo "Synchronizing skills${DRY_RUN:+ (dry run)}..."
rsync -rv ${DRY_RUN:+"$DRY_RUN"} "${EXCLUDES[@]}" "$TEMP_DIR/skills/" "$DEST_DIR/"

echo "Done. Untouched: ${OWNED_SKILLS[*]}. Never re-added: ${REMOVED_SKILLS[*]}."
