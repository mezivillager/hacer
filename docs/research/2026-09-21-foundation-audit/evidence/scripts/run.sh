#!/bin/zsh
# Re-derive every number in F1-measurements.md.
#   zsh run.sh <path-to-a-clean-hacer-checkout> [outdir]
# Measured commit: 6e6e636f0cee7cb7a7c88ff0676bfce18d415bbe (origin/main, 2026-09-21).
# Needs Node 22: `source ~/.nvm/nvm.sh`.  GitHub data needs ~/.local/bin/gh authenticated.
set -e
R=${1:?usage: run.sh <repo-root> [outdir]}
O=${2:-${TMPDIR:-/tmp}/hacer-f1}
S=${0:a:h}
mkdir -p "$O"

echo "== import graph (§2,3,4,7,8) =="
node "$S/import-graph.mjs" "$R" > "$O/graph.json"

echo "== layer violations + cycles (§2) =="
node "$S/layers.mjs" "$O/graph.json" "$R" > "$O/layers.json"

echo "== fan-in/out, sizes, store reach, deep imports, no-test modules (§3,4,7,8) =="
node "$S/metrics.mjs" "$O/graph.json" "$R" > "$O/metrics.json"

echo "== function sizes (§4) =="
node "$S/funcsize.mjs" "$R" > "$O/funcsize.json"

echo "== blast radius per issue (§1) =="
node "$S/blast-all.mjs" "$O/graph.json" > "$O/blast.json"

echo "== effects in pure/state layers (§5) =="
zsh "$S/effects.sh" "$R" > "$O/effects.txt"

echo "== doc drift (§9) =="
node "$S/doc-drift.mjs" "$R" REPO_MAP.md AGENTS.md HACER_LLM_GUIDE.md CONTRIBUTING.md .cursorrules > "$O/docdrift.json"

echo "== merged-PR spread + co-change (§6) =="
# main is REBASE-merged: 0 merge commits, no "(#N)" subjects. PR boundaries must come from the API.
( cd "$R" && gh pr list --state merged --limit 400 \
    --json number,title,mergedAt,files,additions,deletions,baseRefName ) > "$O/prs.json"
node "$S/pr-spread.mjs" "$O/prs.json" 2026-06-01 2026-09-18 > "$O/prspread.json"
node "$S/pr-spread.mjs" "$O/prs.json" 2026-03-01 2026-06-01 > "$O/prspread-all.json"
# commit-level cross-check (shows why git log alone cannot find PRs here):
node "$S/history.mjs" "$R" 2026-06-01 2026-09-18 > "$O/history.json" || true

echo "== CI wall-clock, §7 (no local test run: it would load the machine #313 blames) =="
( cd "$R" && gh run list --workflow=ci.yml --limit 5 --json conclusion,createdAt,updatedAt ) \
  > "$O/ci-runs.json"

echo "done -> $O"
