# 0017. Documentation platform: Astro Starlight at `/docs/` on the existing Pages deploy

- **Status:** Proposed
- **Date:** 2026-09-18
- **Deciders:** Repo owner (to accept); proposed by the #267 research session
- **Phase:** Phase 0.5

## Context
HACER is growing surfaces beyond the 3D app — HDL text, a CLI, MCP/API, 2D — in cost-to-verify
order (`docs/research/2026-09-18-agent-readiness/REPORT.md` §3), under AI-Agent Parity
(`docs/north-star.md`). Epic #260 asks for a public documentation layer for every consumer that
grows *with* the surfaces ("hand in hand"), with generated references that cannot drift from the
code. Today the repo has ~3,000 lines of contributor docs and no consumer-facing page; `README.md`
and `REPO_MAP.md` still promise a Phase-22 "Nextra documentation platform". The app deploys to
GitHub Pages at `https://mezivillager.github.io/hacer/` from `.github/workflows/deploy.yml`
(base path via `BASE_PATH`, read by `vite.config.ts`) with per-PR previews
(`.github/workflows/pr-preview.yml`); releases tag and publish without committing to `main`
(ADR-0015); `pnpm run lint:docs` guards doc paths (ADR-0010, ADR-0014). The evidence behind each
choice below is in `docs/research/2026-09-docs-platform.md`.

## Decision
1. **Generator: Astro Starlight.** Astro 7 runs on the app's Vite 8 line; Pagefind search is built
   in; current, maintained plugins cover TypeDoc (`starlight-typedoc`), `llms.txt`
   (`starlight-llms-txt`), link validation (`starlight-links-validator`) and, if ever needed,
   versions (`starlight-versions`); React islands let a page embed a HACER component later. VitePress
   is the close runner-up (lighter, automatic `base` handling; but stable 1.6 pins Vite 5, its
   Vite-8 line is alpha, and it is Vue-only). Rejected: Docusaurus (second bundler, ~1,000
   packages), Nextra (needs Next.js, unreleased for nine months; this supersedes the Phase-22
   line), hosted Mintlify/GitBook (cannot serve `/hacer/docs/` from Pages; content and build leave
   the repo).
2. **Where it lives and how the two builds compose.** The site is an Astro project rooted at
   `docs/public/` (config `docs/public/astro.config.mjs`; pages `docs/public/src/content/docs/**`;
   static assets `docs/public/static/`). Its `base` is `${BASE_PATH}docs/` and its `outDir` is
   `dist/docs`, so the one `BASE_PATH` variable the app already reads places the docs at
   `/hacer/docs/` on `main` and `/hacer/pr-preview/pr-N/docs/` on a PR. `pnpm run build:docs` builds
   it; `pnpm run build` runs it after the app build, so `ci.yml`, `deploy.yml`, `pr-preview.yml`
   and `release.yml` produce and publish `dist/docs/` through the existing `folder: dist` step
   with no workflow change. `dist/.nojekyll` (already written by both deploy workflows) is required:
   Astro emits `_astro/`, which Jekyll would drop. Because the base differs between `main` and
   each preview, **internal links in pages are relative** (never root-absolute); the link
   validator in (6) enforces that they resolve.
3. **Structure: consumer first, Diátaxis inside.** Top-level sections are the consumers — HDL
   author · CLI user · MCP/agent · API/embedding · (later) plugin author — plus one shared
   `explanation/` section. Inside a consumer: `getting-started` (tutorial), `guides` (how-to),
   `reference` (generated). Diátaxis is applied as a checklist per page, not as the site map (its
   own guidance). Every getting-started follows the agent quick-start rules: the entry command on
   line one, exact commands with expected output, an error table with the literal error text, no
   prose-only steps; the same page serves a human and an agent.
4. **Hand-written vs generated, and the source of truth.** Hand-written: tutorials, how-tos,
   explanation — the markdown under `docs/public/src/content/docs/**`. Generated: the CLI reference
   from the command tree walked in-process (#265); MCP tools from the server's Zod schemas via
   `z.toJSONSchema`, including `annotations` (#264); the command/API registry reference from the
   registry (#261); the TS API from TSDoc via `starlight-typedoc`. CLI/MCP/registry pages are
   **committed** under `reference/`, marked `linguist-generated` in `.gitattributes` (outside the
   PR budget, visible in review) and gated: CI runs `pnpm run docs:gen && git diff --exit-code`
   and the failure message names the command to run. TypeDoc output is generated inside
   `astro build` and gitignored (large, mechanical).
5. **AI consumers.** `starlight-llms-txt` emits `llms.txt`, `llms-full.txt` and `llms-small.txt`
   under `/hacer/docs/`; each consumer's getting-started is listed first. The evidence says no
   crawler discovers `llms.txt`; it pays only when an agent is *pointed* at it — so HACER's MCP
   server, `.mcp.json` and the contributor docs will point at it. The repo-root `llms.txt` stays
   the contributor reading order and gains one line pointing at the public index.
6. **Link checking, two layers.** Internal links and anchors fail the docs build
   (`starlight-links-validator`). External links: `lychee` offline against `dist/docs` on PRs;
   weekly on a schedule with cache and `GITHUB_TOKEN`, non-blocking, reported in the job summary.
   `lint:docs` extends its path-exists check from a file list to the `docs/public/` prefix.
7. **Versioning: latest only.** The site documents `main` and says so in its footer (last-updated
   from git); what shipped is the GitHub Releases page (ADR-0015). Revisit at 1.0.
8. **Search: Pagefind**, static and built in. No Algolia, no hosted index.
9. **Executable examples.** A code sample in a getting-started is a real artifact the test suite
   runs — a colocated `*.test.ts`, or a `.tst`/`.cmp` pair the conformance suite executes —
   imported into the page. A sample that cannot be executed says "illustrative".
10. **Hand in hand (the rule from #260, now an ADR).** A surface capability — CLI command, MCP
    tool, registry command, accepted HDL construct — is not done until its page exists or its
    reference is regenerated in the same PR, or a linked `pubdocs` sub-issue blocks the surface
    epic's exit. `pr-hygiene` WARNs when `src/cli`, `src/mcp`, `src/surfaces` or `src/core/hdl`
    change without `docs/public/**` (#266); the generated-reference gate in (4) FAILs.

## Consequences
- One variable drives both builds; every PR previews its docs; operating cost stays $0 (public
  repo: Pages and Actions are free; every tool is OSS).
- Docs become a build output: a broken page fails `pnpm run build`, which is the point of (10).
  `pnpm run build` grows by roughly the Astro build of a small site (tens of seconds).
- Starlight is 0.x: minor bumps may break the build. CI catches it because `build` includes the
  docs; a dependabot PR for `@astrojs/starlight` is `risk:0` only while CI is green.
- A second content framework (Astro) enters the repo for docs only. `tsc -b` and ESLint scopes
  must exclude `docs/public/` (its own `tsconfig.json`; `.astro/` and `dist/` ignored).
- GitHub Pages serves only the root `404.html` (the app's), so an unknown `/hacer/docs/…` URL
  renders the app shell. Accepted; the docs' own 404 is unreachable there.
- The Phase-22 "Nextra" line in `README.md`, `REPO_MAP.md` and
  `docs/roadmap/phases/phase-22-public-website.md` is superseded.
- Rejected explicitly: versioned docs now; committing TypeDoc output; generating the CLI/MCP
  pages only at build time (no reviewable diff); Algolia DocSearch; a hosted docs product.
- Follow-on work: #262 (PR 2: generator, first pages, deploy at `/docs/`), #275 (PR 3:
  `llms.txt`, link check, `lint:docs` prefix), then #263–#266 against this platform.

## Affected living docs
`README.md` (Documentation table, Phase-22 row), `REPO_MAP.md` (Website line),
`docs/roadmap/phases/phase-22-public-website.md` (Nextra section), `llms.txt` (pointer) — to be
updated in PR 2/PR 3, not here. `AGENTS.md` definition of done: unchanged (`build` covers docs).
`docs/decisions/README.md`: index row added here.

## Links
- [[0003]] design for longevity · [[0010]] portable doc paths · [[0013]] PR budget ·
  [[0014]] cited paths exist · [[0015]] releases tag only
- `docs/research/2026-09-docs-platform.md` (evidence) · `docs/north-star.md` ·
  `docs/research/2026-09-18-agent-readiness/REPORT.md` §3–§4
- Issues #260 (epic), #261–#266 and #275 (sub-issues), #267 (this research), PR #276
- `.github/workflows/deploy.yml` · `.github/workflows/pr-preview.yml` · `.github/workflows/ci.yml` ·
  `vite.config.ts` · `scripts/check-doc-paths.mjs` · `scripts/pr-hygiene.logic.mjs`
