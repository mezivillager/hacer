# Documentation platform for HACER's consumers — state of the art (2025–2026) and a recommendation

- **Date:** 2026-09-18
- **Status:** Research reference (informs [ADR-0017](../decisions/0017-documentation-platform.md))
- **Method:** four parallel web-research tracks (IA + generators, generated references, doc testing + versioning + Pages mechanics, AI-consumer conventions) plus direct registry checks (`npm view`, 2026-09-18). Every claim carries a source `[Sn]`, a date and a confidence (H/M/L). What could not be confirmed is listed in §11, not smoothed over.
- **Trigger:** issue #267 under epic #260 (`pubdocs`). Owner: "research the state of the art best practice documentation approaches and do everything needed to take that live."

## 0. The question and the constraints

HACER will have five consumers — HDL author, CLI user, MCP/agent, API/embedding, and (later) plugin author — plus the 3D app user, arriving in cost-to-verify order (`docs/research/2026-09-18-agent-readiness/REPORT.md` §3). The platform must (a) fit a Vite 8 / pnpm 10 / Node 22 / TypeScript 5.9 repo, (b) publish at `https://mezivillager.github.io/hacer/docs/` next to the app that `.github/workflows/deploy.yml` already puts at `/hacer/` (base path from `BASE_PATH`, read by `vite.config.ts`), with per-PR previews from `.github/workflows/pr-preview.yml`, (c) cost $0, (d) be maintained by a solo owner with agents doing most of the work, (e) serve agents as first-class readers (AI-Agent Parity, `docs/north-star.md`), and (f) make "hand in hand" — a surface capability ships with its page — mechanical (#260, #266). Releases tag and publish without committing to `main` (ADR-0015). `pnpm run lint:docs` already rejects machine-specific paths and dead citations (ADR-0010, ADR-0014).

## 1. Information architecture

- **Diátaxis** splits content by user need — tutorials (learning), how-to guides (tasks), reference (information), explanation (understanding) — and its author is explicit that it is a way of working, not a site plan: it "does not require you to think about dividing up your documentation into four sections … don't create empty structures … It's horrible"; improve one page at a time; reference should mirror the structure of the thing it describes "just like a map does". The site is active (news 2026-08). [S1] — H.
- **Critics** converge on "soft-apply it": Bernard (2024-12) — some knowledge "might not neatly fit", "not go religious", and the Diátaxis site does not follow Diátaxis itself; Johnson (2023-10) found the four silos "overly opinionated and arbitrary" until Procida explained it is an analytical lens, not buckets. Alternatives: *Every Page Is Page One* (readers arrive by search, every topic must stand alone — exactly how an agent arrives) and the Good Docs Project templates (Diátaxis-shaped plus Troubleshooting and Release notes). [S2][S3] — H. HACER's natural top-level axis is therefore the consumer (HDL / CLI / MCP / API); Diátaxis governs what each page *is*.
- **Comparable projects** (one pass, 2026-09-18 [S4] — H on generator, M on the split): HDL/EDA tools are Sphinx — Yosys (getting started / advanced / internals / command reference), Amaranth (tutorial / guide / reference / stdlib), cocotb (sidebar literally "Tutorials, Examples, How-to Guides, Key topics, Reference" — explicit Diátaxis), Verilator (no explanation section). Web and educational simulators are Docusaurus — Chisel (getting started / cookbooks / explanations / reference — explicit Diátaxis), Wokwi (partial), CircuitVerse (a linear book of chapters). The official nand2tetris web IDE has **no docs site**: guides live in a Google Drive folder behind an in-app button, and its README warns the UI text "may be out of sync with the code". Logisim-evolution has a wiki and markdown folder; Digital ships a PDF manual. None uses VitePress or Starlight. HACER's docs are an opportunity, not a catch-up; the drift the web-ide README admits is what "hand in hand" prevents.

## 2. Docs-as-code (what it means in 2025–2026)

The canonical definition is stable: "writing documentation with the same tools as code" — issue tracker, Git, plain-text markup, code review, automated tests (Write the Docs, last edited 2023-10). GitLab keeps docs in the repo, changes them in the same MR, lints with Vale and calls them the single source of truth. What 2025–26 adds is the pressure: GitBook's *State of Docs 2026* (vendor survey, 2026-08) reports 30% naming "keeping docs in sync with the product" as their biggest problem and 70% factoring AI into information-architecture decisions. The current practice therefore adds two things: **generated references produced from the code's own schemas** (so they cannot drift) and **machine-readable entry points for agents** (§8). [S5][S6] — H on the facts, M on the survey's neutrality. HACER already has the contributor half (ADR-0001, ADR-0014, `scripts/check-doc-paths.mjs`); this note is about the public half.

## 3. Static-site generators for a Vite/pnpm repo on a GitHub Pages sub-path

Registry facts checked on 2026-09-18 (`npm view`, all H):

| Package | Version | Last publish | Notes |
|---|---|---|---|
| `vitepress` | 1.6.4 (`latest`) | 2026-09-04 | depends on `vite ^5.4` — a second Vite major beside the app's Vite 8 |
| `vitepress` | 2.0.0-alpha.20 (`next`) | 2026-09-04 | depends on `vite ^8.2` — right Vite, still alpha |
| `astro` | 7.3.3 | 2026-09-16 | depends on `vite ^8.0`; engines `node >= 22.12` |
| `@astrojs/starlight` | 0.42.2 | 2026-09-18 | peer `astro ^7.2`; bundles `pagefind ^1.5` |
| `@docusaurus/core` | 3.10.2 | 2026-09-18 | React; its own bundler (webpack/rspack); built-in versioning |
| `nextra` | 4.6.1 | 2025-12-04 | requires Next.js App Router; nine months without a publish |
| `starlight-typedoc` / `typedoc-vitepress-theme` | 0.23.1 / 1.1.4 | 2026-08 / 2026-09 | both current |
| `starlight-llms-txt` / `vitepress-plugin-llms` | 0.12.0 / 1.14.0 | 2026-09-15 / 2026-09-11 | both current |
| `starlight-links-validator` / `starlight-versions` | 0.26.0 / 0.10.1 | 2026-09 / 2026-08 | current; versions plugin self-described early |

| Criterion | VitePress | Astro Starlight | Docusaurus 3 | Nextra 4 | Hosted (Mintlify, GitBook) |
|---|---|---|---|---|---|
| Fits Vite 8 repo | stable line pins Vite 5; Vite-8 line alpha | yes (Astro 7 = Vite 8), stable | no (own bundler) | no (Next.js) | n/a |
| Sub-path (`/hacer/docs/`) | `base` option, documented for Pages [S7] | Astro `base` + `site`, documented for Pages [S8] | `baseUrl` | static export possible, fragile | custom domain only |
| Search | built-in MiniSearch (client bundle) | Pagefind built in (static index) | Algolia or local plugin | FlexSearch | hosted |
| `llms.txt` | plugin, current | plugin, current | plugin, current | none found | built in |
| TypeDoc integration | theme, current | plugin, current | community | none found | n/a |
| Link validation | built in (`ignoreDeadLinks: false` fails the build) [S7] | plugin, current | built in (`onBrokenLinks`) | none | hosted |
| Versioning | community, thin | plugin, early | built in (and discouraged by its own docs [S9]) | none | paid tiers |
| Embed React from `src/` | no (Vue) | yes (islands) | yes | yes | no |
| Second framework added | Vue (markdown only, invisible) | Astro (docs only) | React + webpack | Next.js | none in repo |
| Install footprint (scratch install, hoisted) [S41] — M | ~92 MB, ~113 pkgs (incl. a second Vite) | ~215 MB, ~278 pkgs | ~243 MB, ~1,072 pkgs | not measured | none |
| Stability | 1.x stable; 2.0 alpha after 20 pre-releases | 0.x — 0.42.0 flagged a "potentially breaking" markup change | 3.x stable | release workflow broken since 2025-12-31 (issue #5010, open) [S42] | vendor |
| Cost | $0 | $0 | $0 | $0 | Mintlify Starter $0 (Pro $450/mo; OSS program: Pro free for non-commercial, non-VC OSS); GitBook free = 1 user, no custom domain [S43] |

Two mechanics matter for HACER specifically, both checked (H unless noted):

- **Composing two builds on one `gh-pages` branch.** Build the app to `dist/` with `BASE_PATH=/hacer/`, the docs with `base: '/hacer/docs/'` into `dist/docs/`, deploy `dist` once; `clean-exclude: pr-preview` keeps previews. `.nojekyll` is mandatory for Astro output because Jekyll drops `_astro/` (Astro emits underscore-prefixed asset dirs; Vite's `assets/` is fine) — both deploy workflows already `touch dist/.nojekyll`. GitHub Pages serves only the root `404.html`, so a missing `/hacer/docs/…` URL falls through to the app's SPA fallback. [S8][S10][S11] — H, the 404 rule from community threads — M.
- **Starlight under a sub-path.** Astro's `base` works for Starlight; the open Starlight discussion about "custom subpath" is about mounting Starlight *inside* another Astro site (title link, theme key), which is not this setup. [S12] — M. One real caveat: Astro states "all of your internal page links must be prefixed with your base value" — Starlight's nav and sidebar are base-aware, but root-absolute links inside markdown are not (a community plugin, `starlight-base-path`, exists for that). Because HACER's base differs between `main` and each PR preview, content links must be *relative*, which the link validator can enforce. VitePress rewrites markdown links and assets for `base` automatically; its 2.0 alpha even added a relative `./` base. [S7][S8][S44] — H. Starlight fixes pages at `<srcDir>/content/docs/`; a custom `glob()` loader with another `base` is used in the wild but not a documented contract. [S13] — M.

**Reading:** VitePress and Starlight are the two serious candidates and it is closer than the plugin table suggests. VitePress is simpler (a folder of markdown, one config file), lighter, handles `base` for you and validates internal links with no plugin; its cost is a second Vite major in the tree today (or an alpha) and a Vue-only component model. Starlight matches the app's build line *now*, has the fuller current plugin set for exactly the features this note wants (llms.txt, TypeDoc, link validation, versions — maintained by Starlight's own core contributors), and can embed HACER's React components in a page when the 2D surface exists — a longevity argument (ADR-0003). Its costs are 0.x churn, a larger install and relative-link discipline. Docusaurus is the heaviest by an order of magnitude; Nextra would add Next.js and has not shipped in nine months; hosted products cannot serve `/hacer/docs/` from Pages at all and move the content out of the repo the agents work in.

## 4. Generated references (the "cannot drift" half of #260)

- **TS API.** TypeDoc 0.28.20 supports TS 5.9 and 6.0; `typedoc-plugin-markdown` 4.13 (peer `typedoc 0.28.x`) renders markdown, and `starlight-typedoc` runs it *inside* `astro build`, emitting Starlight-frontmattered pages and a sidebar group. Drift gates exist in TypeDoc itself: `validation.notDocumented`, `treatWarningsAsErrors`. `@packageDocumentation` must be the first comment in a file. `api-extractor` adds API-report/rollup value HACER does not need yet; TSDoc is still "a proposal". [S14][S15] — H.
- **MCP tools.** The MCP spec (revision 2026-07-28) defines a tool as `name`, `title`, `description` ("a hint to the model"), `inputSchema` (JSON Schema 2020-12), optional `outputSchema`, and `annotations` (`readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint` — clients must treat them as untrusted hints); servers should list tools in deterministic order. Zod 4 has native `z.toJSONSchema` with `.meta({title, description, examples})`; `zod-to-json-schema` is legacy. The official MCP servers document tools by hand in READMEs (bullet per tool + an annotations table); no standard generator exists; the Inspector's `--cli … --method tools/list` prints the catalog as JSON. A generated tool page should therefore carry: name/title, the description verbatim, the annotations table, the input schema as a property table (name, type, required, description, default/enum), the output schema if any, and one example call + result. Source of truth = the same Zod object passed to `registerTool`. [S16][S17][S18] — H.
- **CLI.** commander 15 exposes the command tree (`program.commands`, `Help` class) for an in-process walker; oclif has the only first-party markdown generator (`oclif readme`) but is the heaviest framework; citty/yargs need the same walker; clipanion has the nicest `cli.definitions()` but is a stale RC. Prior art: `gh` generates markdown from its cobra tree at build; `cargo` regenerates man pages in CI and fails on `git status --porcelain`. Least friction for a strict-TS Node CLI: commander + a ~60-line script that walks the tree and writes one frontmattered page per command. [S19][S20] — H.
- **Drift prevention.** Pattern A: commit the generated markdown and gate CI with `generate && git diff --exit-code` (cargo, Terraform providers, generic "diff-check" actions) — reviewable diff, greppable in-repo, fails loudly. Pattern B: generate only at docs-build time (starlight-typedoc) — zero drift by construction, nothing to review. Both need deterministic output (no timestamps, sorted tools). [S20][S21] — H.

## 5. Doc testing and link checking

- **Executable examples.** Zero-dependency baseline: every sample is a real colocated test (or a `.tst`/`.cmp` pair the conformance suite runs) imported into the page — VitePress `<<< @/path#region`, Starlight via `?raw` import into a code component (the Starlight form not fetched, §11). `vite-plugin-doctest` 3.0.0 (peer `vite >= 8`, `vitest >= 4.1`) turns fenced `ts` blocks tagged `@import.meta.vitest` in `.md` into Vitest tests, with limits (no static `import`, no lifecycle hooks). Twoslash gives compile-only guarantees and is known to OOM on large sites. Rust `cargo test` and Python `doctest` are the framing: the sample *is* a test. [S22][S23] — H.
- **Link checking.** `lychee-action` v2.9.0 (lychee 0.24.2) with `--offline --root-dir dist --include-fragments anchor-only './dist/**/*.html'` checks a built site deterministically on PRs; external links need `--cache`, `GITHUB_TOKEN` (github.com rate limits), `--max-concurrency` low, and tolerance for 403 from bot-blocking hosts — so run them on a weekly schedule, non-blocking, into the job summary. lychee skips gitignored files by default (`--no-ignore`). `markdown-link-check` is being replaced by lychee in the wild (cannot resolve SSG routes); `htmltest` is dormant since 2022. Generator-level: VitePress fails the build on dead internal links by default; Starlight via `starlight-links-validator`. [S24][S25] — H. `lint:docs` remains necessary: it checks *source* path citations, which no rendered-link checker sees.

## 6. Versioning per release tag

- Docusaurus, the one generator with built-in versioning, advises against it ("increase your build time, and introduce complexity"). VitePress has no first-party answer; `starlight-versions` 0.10.1 works but calls itself early and opinionated. [S9][S26] — H.
- Tying docs to tags under semantic-release: a `release` event created with `GITHUB_TOKEN` does not trigger workflows; you either use a PAT/App token or run the docs job inside the release workflow. HACER's releases already never touch `main` (ADR-0015), so "docs describe `main`, Releases describe what shipped" is the honest stance until 1.0. [S27] — H.

## 7. Search

Pagefind (bundled with Starlight and Nextra; a post-build step for VitePress/Docusaurus) indexes the built HTML and loads index fragments on demand — a 10,000-page site stays under ~300 kB of payload, "closer to 100 kB" for most sites; it works on a Pages sub-path with no service, and only on the *built* site (no search in dev). VitePress's MiniSearch runs in the browser with fuzzy + prefix matching and no infrastructure (index size at scale: unverified). Algolia DocSearch is free for public technical docs by application, rejects sites "not production ready", crawls weekly, and adds API keys and a third party for no gain at HACER's size. [S7][S28] — H.

## 8. AI-consumer conventions

- **`llms.txt`** (llmstxt.org, spec updated 2026-08): H1, blockquote summary, H2 sections of `- [title](url): note` links, an `## Optional` section; `llms-full.txt` (whole site) and per-page `.md` twins are acknowledged conventions; v2 adds `<link rel="alternate" type="text/markdown">` discovery. Adopters verified: Anthropic, the MCP spec site, Cloudflare (`/llms.txt`, per-page `/index.md`, `Accept: text/markdown`), Stripe (append `.md`), Mintlify (automatic). [S29][S30][S31] — H.
- **The skeptic evidence is strong.** Google's Mueller: no AI service says it uses it, "comparable to the keywords meta tag" (2025-04). Ahrefs, 137,210 domains (2026-06): 97% of `llms.txt` files got zero requests; bots never fetch a non-existent one — nothing goes looking. A 14-day single-site log: 723 `robots.txt` fetches, 0 `llms.txt`. [S32][S33] — H. Who does read it: coding agents *told* about it (Claude Code, Cursor, Cline) via a `CLAUDE.md`, a skill or an MCP tool description. [S34] — M.
- **Verdict:** `llms.txt` buys nothing for discovery and everything for *pointed* agents — cheap, and it forces a curated page inventory. Ship it, keep it generated (a stale one with dead links is worse than none), and point HACER's own MCP server and contributor docs at it. The repo-root `llms.txt` is a contributor reading order, not the llmstxt.org shape.
- **MCP as a docs channel ("docs as tools").** Mintlify, Context7, Cloudflare and Stripe all expose docs through MCP search/read tools; the MCP spec's *resources* (`uri`, `name`, `description`, `mimeType`, `audience`, `priority`) are the primitive for it. Consequence for writing: an agent receives one page or one snippet with no navigation, so each page must be self-contained, task-titled, with a runnable example and the literal error strings. Anthropic's tool-writing guidance applies to reference pages too: describe it as to a new hire, make implicit context explicit, prompt-engineer error text. [S16][S35][S36] — H.
- **Agent quick-start rules distilled** (agents.md, Claude Code memory docs, Stripe `/agents`, Cloudflare): one page per surface, openable as `.md`; the entry command on line one; exact copy-pasteable commands with prerequisites; expected output or a verification step after every step; instructions concrete enough to verify ("run `pnpm test:run`", not "test your changes"); an error table with the literal text and the fix; a machine-readable index beside the prose; a reference entry = name, one-line purpose, typed params, read-only/destructive flag, example call and result. [S31][S37][S38] — H.
- **Retrieval-friendly writing** (kapa.ai, Fern): sections that make sense in isolation; descriptive slugs; no meaning hidden in tabs/accordions; text alternatives for diagrams; stable URLs (a moved page breaks every cached index); a "copy page as markdown" affordance. [S39][S40] — H/M.

## 9. Cost and maintenance burden (solo owner, agents doing most work)

- **Operating cost: $0** on every candidate except hosted products beyond their free tier — GitHub Pages and Actions are free on a public repo; Pages limits (1 GB site, 100 GB/month, ~10 builds/hour soft) are far away, though `pr-preview/` must keep being cleaned on PR close. [S11] — H.
- **Maintenance:** the recurring cost is dependency churn. Starlight is 0.x (minor bumps may break), Astro majors land roughly yearly; VitePress 1.x is stable but leaves you on Vite 5 until 2.0 ships; Docusaurus is the largest dependency tree (~1,000 packages). With the docs in `pnpm run build`, CI turns any breakage into a red dependabot PR rather than a silent 404 — the cheapest guard there is. Generated references cost nothing to maintain once the gate exists; hand-written pages cost exactly what "hand in hand" enforces — which is the point: the web-ide README's "may be out of sync with the code" is the failure mode being designed out.

## 10. Recommendation

1. **Astro Starlight**, an Astro project rooted at `docs/public/`, built by `pnpm run build:docs` into `dist/docs/` with `base = ${BASE_PATH}docs/`, so the existing deploy and preview workflows publish it unchanged; `pnpm run build` calls it last.
2. **Consumer-first navigation with Diátaxis inside each consumer**; getting-started pages written to the agent quick-start rules; generated `reference/` for CLI, MCP and the registry committed and CI-gated (`docs:gen && git diff --exit-code`), TypeDoc generated at build time; `llms.txt` family via `starlight-llms-txt`; Pagefind search; internal links fail the build, external links checked weekly by lychee; latest-only docs until 1.0.
3. **Runner-up: VitePress** if the owner prefers the flattest possible markdown layout, the lighter install and automatic `base` handling, and never wants React in a docs page — everything else in this note transfers.

Cost if wrong: swapping Starlight for VitePress later is a config folder and a sidebar; the markdown (relative links), the generators, the workflows and the rules survive the swap. Do not wait for VitePress 2.0 to go stable: it has been alpha for 20 releases and nothing here depends on it.

## 11. Could not verify

- The Starlight `?raw`/code-component way to import a test file as a snippet (VitePress's `<<<` was verified); whether `starlight-llms-txt` emits per-page `.md` twins (site-level files verified).
- Whether JamesIves branch-push deploys count toward the Pages 10-builds/hour soft limit; the root-only `404.html` rule is from community threads, not the official page.
- The comparable-projects survey (§1) is breadth-first, one pass; Vercel's `llms.txt` support; a primary source for Google's July-2025 statement (secondary only); any study showing front-matter metadata improves LLM retrieval (guidance only, no data); whether Diátaxis still endorses its former "complex hierarchies" page (now 404).
- Install footprints are one scratch measurement each (hoisted pnpm, macOS), not build times; VitePress's MiniSearch index size at scale; Nextra `basePath` + Pagefind end to end on a Pages sub-path.
- Whether a custom `glob()` loader for Starlight pages outside `src/content/docs` keeps every Starlight feature (used in the wild; not a documented contract) — ADR-0017 avoids needing it.
- Build-time cost of Astro on the repo's CI runner (estimated "tens of seconds"; measure in PR 2).

## Sources

- [S1] https://diataxis.fr/how-to-use-diataxis/ ; https://diataxis.fr/start-here/ ; https://diataxis.fr/news/ (site active 2026-08)
- [S2] https://emmanuelbernard.com/blog/2024/12/19/diataxis/ (2024-12-19) ; https://idratherbewriting.com/blog/what-is-diataxis-documentation-framework (2023-10-18)
- [S3] https://xmlpress.net/publications/eppo/ (Every Page Is Page One) ; https://www.thegooddocsproject.dev/template (©2026)
- [S4] surveyed 2026-09-18: github.com/nand2tetris/web-ide (README) ; yosyshq.readthedocs.io ; amaranth-lang.org/docs ; docs.cocotb.org/en/stable ; verilator.org/guide/latest ; chisel-lang.org/docs ; docs.wokwi.com ; docs.circuitverse.org ; github.com/logisim-evolution/logisim-evolution ; github.com/hneemann/Digital
- [S5] https://www.writethedocs.org/guide/docs-as-code/ (last edited 2023-10-09) ; https://docs.gitlab.com/development/documentation/
- [S6] https://www.stateofdocs.com/ (GitBook, 2026-08-28; vendor survey)
- [S7] https://vitepress.dev/reference/site-config (`base`, `ignoreDeadLinks`, search) — fetched 2026-09-18
- [S8] https://docs.astro.build/en/reference/configuration-reference/ (`root`, `base`, `site`, `outDir`, `--root`) and https://docs.astro.build/en/guides/deploy/github/ — 2026-09-18
- [S9] https://docusaurus.io/docs/versioning ("Most of the time, you don't need versioning")
- [S10] https://github.com/withastro/astro/issues/14247 and https://github.com/withastro/starlight/issues/3339 (`_astro/` dropped by Jekyll; 2025-07/08)
- [S11] https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits ; https://github.com/orgs/community/discussions/64096 (root 404) ; JamesIves README (`clean-exclude`)
- [S12] https://github.com/withastro/starlight/discussions/966 (custom subpath inside one Astro site; open, last activity 2025-10)
- [S13] https://github.com/withastro/starlight/issues/2698 (custom `glob()` base for the docs collection; closed not planned, 2024-12)
- [S14] https://typedoc.org/documents/Changelog.html ; https://typedoc.org/documents/Options.Validation.html (0.28.20, 2026-07)
- [S15] https://typedoc-plugin-markdown.org/docs/CHANGELOG ; https://starlight-typedoc.vercel.app/getting-started/ (2026-08/09)
- [S16] https://modelcontextprotocol.io/specification/2026-07-28/server/tools ; https://blog.modelcontextprotocol.io/posts/2026-07-28/
- [S17] https://zod.dev/json-schema (Zod 4 `z.toJSONSchema`); https://github.com/matejchalk/zod2md (0.3.6, 2026-08)
- [S18] https://github.com/modelcontextprotocol/servers/blob/main/src/filesystem/README.md ; https://modelcontextprotocol.io/docs/2026-07-28/tools/inspector
- [S19] https://github.com/tj/commander.js/blob/master/Readme.md (15.0, 2026-05) ; https://github.com/oclif/oclif/blob/main/docs/readme.md
- [S20] https://github.com/cli/cli/blob/trunk/cmd/gen-docs/main.go ; https://github.com/rust-lang/cargo/blob/master/ci/validate-man.sh
- [S21] https://nickcharlton.net/posts/diff-check-github-action (2024-02) ; https://github.com/StackGuardian/terraform-provider-stackguardian/pull/117
- [S22] https://vitepress.dev/guide/markdown (import code snippets) ; https://github.com/ssssota/doc-vitest (`vite-plugin-doctest` 3.0.0)
- [S23] https://shiki.style/packages/twoslash ; https://vitest.dev/guide/in-source
- [S24] https://github.com/lycheeverse/lychee-action/releases (v2.9.0, 2026-07) ; https://lychee.cli.rs/recipes/root-dir/ ; https://lychee.cli.rs/troubleshooting/rate-limits/
- [S25] https://www.npmjs.com/package/starlight-links-validator ; https://github.com/wjdp/htmltest/releases (last 2022-11)
- [S26] https://github.com/HiDeoo/starlight-versions ; https://github.com/IMB11/vitepress-versioning-plugin (author stepped back)
- [S27] https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows (`GITHUB_TOKEN` events do not trigger runs)
- [S28] https://pagefind.app/ ; https://docsearch.algolia.com/ (OSS program)
- [S29] https://llmstxt.org/ (spec; modified 2026-08-10)
- [S30] https://developers.cloudflare.com/docs-for-agents/ (2026-06) ; https://platform.claude.com/docs/llms.txt
- [S31] https://docs.stripe.com/agents ; https://www.mintlify.com/docs/ai/llmstxt
- [S32] https://www.searchenginejournal.com/google-says-llms-txt-comparable-to-keywords-meta-tag/544804/ (2025-04-17)
- [S33] https://ahrefs.com/blog/llmstxt-study/ (2026-06-15) ; https://saaslinks.net/blog/llms-txt-server-log-study (2026-08-03)
- [S34] https://mecanik.dev/en/posts/does-llms-txt-do-anything-yet/ (2026-08; secondary)
- [S35] https://www.anthropic.com/engineering/writing-tools-for-agents (2025-09-11)
- [S36] https://www.mintlify.com/docs/ai/model-context-protocol ; https://github.com/mcp/upstash/context7
- [S37] https://agents.md/ ; https://code.claude.com/docs/en/memory
- [S38] https://developers.cloudflare.com/agents/
- [S39] https://docs.kapa.ai/improving/writing-best-practices
- [S40] https://buildwithfern.com/post/how-to-write-llm-friendly-documentation (2026-03) ; https://github.com/okineadev/vitepress-plugin-llms
- [S41] scratch installs by the research track on 2026-09-18 (pnpm, hoisted, macOS; deleted afterwards) — one measurement each
- [S42] https://github.com/shuding/nextra/issues/5010 (opened 2026-06-02, open; release workflow failing since 2025-12-31) ; https://nextra.site/docs/guide/static-exports
- [S43] https://mintlify.com/pricing ; https://mintlify.com/oss-program ; https://www.gitbook.com/pricing
- [S44] https://docs.astro.build/en/guides/deploy/github/ ("internal page links must be prefixed with your base") ; https://github.com/andriygm/starlight-base-path ; VitePress CHANGELOG 2.0.0-alpha.20 (relative base, `assetsBase`)
