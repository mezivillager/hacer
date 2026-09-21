#!/bin/zsh
# Effects in the pure/state layers. Usage: ./effects.sh <repo-root>
# Uses the real grep (not Claude Code's ugrep shim) for exhaustiveness.
R=${1:?repo-root}
cd "$R" || exit 1
DIRS=(src/simulation src/core src/store)
echo "### pattern: file:line  (prod = not *.test.*)"
for pat in 'Date\.now' 'Math\.random' 'setInterval' 'setTimeout' 'clearInterval' 'performance\.now' '\bnew Date\b' \
           '\bwindow\b' '\bdocument\b' 'localStorage' 'sessionStorage' 'navigator\.' 'requestAnimationFrame' \
           'import\.meta\.env' 'console\.(log|warn|error|info|debug)' 'from .@/lib/notify' '\bnotify\b' 'crypto\.randomUUID'; do
  echo "== $pat =="
  command grep -rnE "$pat" ${DIRS[@]} --include='*.ts' --include='*.tsx' 2>/dev/null \
    | grep -v '\.test\.' | sed 's/[[:space:]]\+/ /g' | cut -c1-190
done
echo
echo "### counts (prod only, excluding *.test.*)"
for pat in 'Date\.now' 'Math\.random' 'setInterval' 'setTimeout' '\bwindow\b' '\bdocument\b' 'localStorage' 'import\.meta\.env' 'console\.' 'notify'; do
  n=$(command grep -rnE "$pat" ${DIRS[@]} --include='*.ts' --include='*.tsx' 2>/dev/null | grep -vc '\.test\.')
  echo "$n  $pat"
done
