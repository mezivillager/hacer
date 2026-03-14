#!/bin/bash

# sync-superpowers.sh
# Synchronizes the "Superpowers" documentation and configuration across the workspace.

set -e

REPO_URL="https://github.com/obra/superpowers.git"
DEST_DIR=".claude/skills"
TEMP_DIR=".tmp_superpowers"

echo "🔄 Syncing Superpowers skills from $REPO_URL..."

# Ensure we are in a git repository (works in normal clones and worktrees)
if ! git rev-parse --show-toplevel >/dev/null 2>&1; then
  echo "❌ Error: Please run this script from a git repository."
  exit 1
fi

mkdir -p "$DEST_DIR"
rm -rf "$TEMP_DIR"

echo "📥 Cloning latest skills..."
git clone --depth 1 "$REPO_URL" "$TEMP_DIR"

# Sync skills using rsync
# --recursive: copy directories
# --update: skip files that are newer in destination
# --exclude: don't touch our custom hacer-patterns
echo "📂 Synchronizing skills..."
rsync -rv --update \
  --exclude='hacer-patterns/' \
  "$TEMP_DIR/skills/" "$DEST_DIR/"

echo "🧹 Cleaning up..."
rm -rf "$TEMP_DIR"

echo "✅ Superpowers skills updated successfully! Your 'hacer-patterns' skill was preserved."
