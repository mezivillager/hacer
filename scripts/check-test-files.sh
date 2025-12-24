#!/bin/bash

# TDD Enforcement: Check that new/modified source files have corresponding test files
# This script warns (does not block) when test files are missing

set -e

# Get staged .ts and .tsx files (excluding tests, types, and config files)
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx)$' | grep -v '\.test\.' | grep -v '\.d\.ts$' | grep -v 'types\.ts$' | grep -v '\.config\.' | grep -v 'index\.ts$' || true)

if [ -z "$STAGED_FILES" ]; then
  exit 0
fi

MISSING_TESTS=()

for file in $STAGED_FILES; do
  # Skip files in certain directories
  if [[ "$file" == e2e/* ]] || [[ "$file" == scripts/* ]] || [[ "$file" == docs/* ]]; then
    continue
  fi

  # Determine expected test file path
  dir=$(dirname "$file")
  ext="${file##*.}"
  # Use basename with extension to remove it, then add .test.extension
  base=$(basename "$file" ".$ext")
  
  test_file="$dir/$base.test.$ext"
  
  # Check if test file exists
  if [ ! -f "$test_file" ]; then
    MISSING_TESTS+=("$file -> $test_file")
  fi
done

if [ ${#MISSING_TESTS[@]} -gt 0 ]; then
  echo ""
  echo "⚠️  TDD Warning: The following files may be missing test files:"
  echo ""
  for item in "${MISSING_TESTS[@]}"; do
    echo "   $item"
  done
  echo ""
  echo "   Remember: Write tests FIRST (Red), then implement (Green)."
  echo "   See: docs/testing/"
  echo ""
fi

exit 0
