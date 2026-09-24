#!/usr/bin/env bash
# Vendor nand2tetris .hdl/.tst/.cmp files into conformance/vectors/<project>/.
#
# Clones https://github.com/nand2tetris/web-ide.git at the commit named in
# scripts/sync-vectors.logic.mjs (never a sibling ../web-ide checkout) and extracts
# the hdl/tst/cmp string exports. Project 1 only; projects 2-5 are follow-ups (#193).
#
#   bash scripts/sync-vectors.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ "$(node -v 2>/dev/null)" != v22* ]]; then
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  # shellcheck disable=SC1091
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm use 22 >/dev/null
fi

META="$(node --experimental-strip-types -e "
import { WEB_IDE_URL, WEB_IDE_COMMIT, sparsePaths } from './scripts/sync-vectors.logic.mjs'
process.stdout.write([WEB_IDE_URL, WEB_IDE_COMMIT, ...sparsePaths()].join('\n'))
")"
URL="$(printf '%s\n' "$META" | sed -n '1p')"
COMMIT="$(printf '%s\n' "$META" | sed -n '2p')"
mapfile -t SPARSE < <(printf '%s\n' "$META" | tail -n +3)

WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

git clone --filter=blob:none --sparse "$URL" "$WORKDIR/web-ide"
git -C "$WORKDIR/web-ide" sparse-checkout set "${SPARSE[@]}"
git -C "$WORKDIR/web-ide" checkout --detach "$COMMIT"

ACTUAL="$(git -C "$WORKDIR/web-ide" rev-parse HEAD)"
if [[ "$ACTUAL" != "$COMMIT" ]]; then
  echo "sync-vectors: checkout is $ACTUAL, wanted $COMMIT" >&2
  exit 1
fi

node --experimental-strip-types "$ROOT/scripts/sync-vectors.mjs" "$WORKDIR/web-ide" "$ROOT/conformance/vectors"
echo "sync-vectors: wrote conformance/vectors from ${COMMIT}"
