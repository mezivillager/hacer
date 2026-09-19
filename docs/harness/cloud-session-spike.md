# Cloud-session spike (#158) — results, 2026-09-19

Can the agent build/test loop leave the owner's laptop? Measured in a Claude cloud routine run
(one-off, Sonnet 5, Default environment, "Trusted" network), 2026-09-19 17:35–17:41 UTC.

## Environment (preinstalled, no setup script)

| Fact | Value |
|---|---|
| OS | Ubuntu 24.04.4 LTS, x64 |
| CPU / memory | 4 vCPU / 15 GiB |
| Node / pnpm | v22.22.2 / 10.12.1 (already present) |
| Browsers | Chromium preinstalled at `/opt/pw-browsers` (revision 1194) |

## The loop, timed

| Step | Wall time | Exit |
|---|---|---|
| `pnpm install --frozen-lockfile` | 11.0 s | 0 |
| `pnpm run lint` (tsc -b + eslint) | 45.8 s | 0 |
| `pnpm run test:run` (130 files, 1835 tests) | 69.1 s | 0 |
| `pnpm run build` | 15.6 s | 0 |
| `pnpm run lint:docs` | 0.8 s | 0 |
| `pnpm exec playwright install --with-deps chromium` | 19.9 s | 1 |

The whole definition of done runs green in about two and a half minutes.

## What did not work

1. **Browser download blocked.** OS packages installed, but the Chromium download was refused by the
   network allowlist (`403 host "cdn.playwright.dev"`). The preinstalled Chromium is revision 1194;
   the repo's `@playwright/test` (^1.60) wants 1223, so it cannot be reused as is.
2. **No write access to GitHub (fixed 2026-09-19).** Reads worked, but `git push` and the GitHub
   tools both returned 403 ("Claude doesn't have GitHub access to mezivillager/hacer"): the Claude
   GitHub App was not installed on the repository with write permission. The run's commit was lost
   with the container; this page was written from its log. After the owner granted write access, a
   second one-off routine pushed a test branch successfully. Deleting it from the session
   (`git push --delete`) was refused with HTTP 403 by the session's git proxy, so cloud sessions can
   push branches but not delete them. That is harmless: `delete_branch_on_merge` removes merged
   branches, and a stray branch can be deleted locally.

## Verdict

Everything except browser tests can run in a Claude cloud session today: lint, unit tests, build and
the docs checks pass in ~2.5 minutes on a 4-vCPU VM with nothing to install. Two owner-side settings
make it a full builder: (1) install the Claude GitHub App on `mezivillager/hacer` with write access;
(2) for browser suites, either allow `cdn.playwright.dev` in the cloud environment's network settings
or keep browser runs in GitHub Actions (`browser-qa`), which already works. (1) was done on
2026-09-19, so cloud runs can now publish; (2) is open.

## Proposed environment setup

```bash
corepack enable
pnpm install --frozen-lockfile
# only if cdn.playwright.dev is allowed in the environment's network access:
pnpm exec playwright install chromium
```
