#!/usr/bin/env bash
# Run Stryker on changed source files only (for PRs). Limits files to keep runtime under ~3 min.
# Includes any changed .ts in src/ (excluding test/spec). Business logic only, no UI components (.tsx).
set -e

BASE_SHA="${1:-origin/main}"
[ -z "$BASE_SHA" ] && BASE_SHA="origin/main"
MAX_FILES="${STRYKER_CHANGED_MAX_FILES:-3}"

changed=$(
  git diff --name-only --diff-filter=ACMRT "$BASE_SHA"... HEAD 2>/dev/null |
  grep -E '^src/.*\.ts$' |
  grep -v '\.test\.ts$' |
  grep -v '\.spec\.ts$' ||
  true
)

count=$(echo "$changed" | grep -c . || true)
if [ "$count" -eq 0 ]; then
  echo "No mutable source files changed, skipping Stryker"
  mkdir -p reports/mutation
  exit 0
fi

limited=$(echo "$changed" | head -n "$MAX_FILES")
limited_count=$(echo "$limited" | grep -c . || true)

if [ "$count" -gt "$limited_count" ]; then
  echo "Limiting to $limited_count of $count changed files (max $MAX_FILES)"
fi

# Stryker --mutate accepts comma-separated values; repeated --mutate overwrites
mutate_list=$(echo "$limited" | grep -v '^$' | paste -sd ',' -)
npx stryker run --mutate "$mutate_list"
