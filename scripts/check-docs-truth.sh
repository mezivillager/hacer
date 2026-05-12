#!/usr/bin/env bash
set -euo pipefail

fail=0

check_absent() {
  local label="$1"
  local pattern="$2"
  shift 2
  if rg -n "$pattern" "$@"; then
    printf '\n[docs:check] stale reference found: %s\n' "$label" >&2
    fail=1
  fi
}

check_present() {
  local label="$1"
  local pattern="$2"
  shift 2
  if ! rg -n "$pattern" "$@" >/dev/null; then
    printf '\n[docs:check] expected reference missing: %s\n' "$label" >&2
    fail=1
  fi
}

active_docs=(
  README.md
  HACER_LLM_GUIDE.md
  REPO_MAP.md
  .cursorrules
  .github/copilot-instructions.md
  docs/roadmap
  docs/testing
  docs/semantic-release.md
  docs/TESTING_SEMANTIC_RELEASE.md
  docs/plans/phase-0.5-tickets
  docs/plans/phase-0.5-tickets-CHECKLIST.md
)

check_absent \
  "active docs must not prescribe Ant Design" \
  "from ['\"]antd|from ['\"]@ant-design|vi\\.mock\\(['\"]antd|Ant Design's|Ant Design UI|Ant Design based|Antd mock|Layout\\.Sider|Import from \`antd\`|Ant Design Message/Notification" \
  "${active_docs[@]}"

# Storybook is de-scoped; `docs/plans/**` may still mention it until roadmap/ticket tasks land.
# Exclude the frozen migration plan tree ("Do Not Modify") from this grep.
check_absent \
  "living docs/plans/README/roadmap must not treat Storybook as current scope" \
  "Storybook|storybook|@storybook" \
  README.md docs/roadmap package.json docs/plans \
  --glob '!docs/plans/2026-04-17-design-system-migration/**'

check_absent \
  "active docs must not claim stale tool majors or uninstalled quality tools are current (see Drift checker design notes)" \
  "Zustand 4\\.x|Vite 5\\.x|React Three Fiber 6\\.x|pnpm\\s+9\\+|fast-check.*configured|fast-check implemented|Property Tests.*Complete|Semantic release.*Planned|Implement semantic release|Design system.*Planned" \
  README.md docs/roadmap docs/testing docs/semantic-release.md docs/TESTING_SEMANTIC_RELEASE.md

check_absent \
  'package engines must not stay on ">=20" after refresh' \
  '"node": ">=20"' \
  package.json

check_absent \
  'workflows must not pin Node 20 after refresh' \
  "node-version: ['\"]20['\"]" \
  .github/workflows

check_absent \
  "package must stay free of removed/unselected tooling" \
  "\"antd\"|@ant-design|storybook|@storybook|fast-check|prettier" \
  package.json

check_absent \
  "source and e2e code must stay Ant-free" \
  "from ['\"]antd|from ['\"]@ant-design" \
  src e2e

check_present \
  "README must name current UI stack" \
  "Tailwind CSS v4.*shadcn/ui|shadcn/ui.*Tailwind CSS v4" \
  README.md

check_present \
  "HACER guide must name current UI stack" \
  "Tailwind CSS v4.*shadcn/ui|shadcn/ui.*Tailwind CSS v4" \
  HACER_LLM_GUIDE.md

check_present \
  "release docs must describe semantic-release" \
  "semantic-release" \
  .releaserc.json .github/workflows/release.yml docs/semantic-release.md

exit "$fail"
