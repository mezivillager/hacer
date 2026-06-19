# LLM documentation sync — author & reviewer passes

**Purpose:** Keep **living** documentation aligned with the repo after code changes — without automated grep CI.

**Design:** [`docs/superpowers/specs/2026-05-12-llm-docs-sync-design.md`](./superpowers/specs/2026-05-12-llm-docs-sync-design.md)

---

## Roles

| Pass | Who | When |
|------|-----|------|
| **Author** | Implementing agent | Before claiming work complete (after tests/build pass). |
| **Reviewer** | Reviewer agent or human | Before approving a merge that materially changes product behavior, phase delivery, repo layout, or public README claims. |

Code **definition of done** is unchanged: `pnpm run lint`, `pnpm run test:run`, `pnpm run test:e2e:store`, `pnpm run build`.

---

## Living documentation inventory

Update **only** rows that this change logically touches. Mark others **N/A**.

| Surface | Update when |
|---------|-------------|
| `REPO_MAP.md` | Paths/entry points moved, added, or retired; phase banner wording changes |
| `docs/roadmap/implementation.md` | Phase sync table, stack, implementation checklist, or quality gates change |
| `docs/roadmap/README.md` | Phase navigation or definition-of-done commands change |
| `docs/roadmap/phases/*.md` | Phase “current truth” contradicts shipped behavior |
| `docs/plans/phase-0.5-tickets-CHECKLIST.md` | A Phase 0.5 ticket completes or rescopes |
| `docs/plans/phase-0.5-tickets/P05-*.md` | Ticket text (imports, mounting, evidence paths) no longer matches code |
| `README.md` | User-visible features, prerequisites, or roadmap summary contradict reality |
| `.cursorrules` | Phase-tracking banner must match agreed wording elsewhere |
| `HACER_LLM_GUIDE.md` | Mandatory patterns or stack examples change |
| `.github/copilot-instructions.md` | Same agent-facing rule changes as above |
| `docs/decisions/*.md` | A cross-cutting decision, new direction, or rejected approach emerged this session (add an ADR via the `docs-sync` skill) |

---

## Frozen / do not churn

Unless the task explicitly includes them:

- Archival specs/plans marked **Do Not Modify** (e.g. dated migration trees)
- `tasks/lessons.md` except when recording a lesson per project convention
- `docs/superpowers/plans/**` as historical execution artifacts

---

## Capturing emergent decisions (ADRs)

Living-doc reconciliation keeps docs aligned with **code**. But sessions also produce **decisions and
new directions** that aren't tied to a single file. Capture those as ADRs in
[`docs/decisions/`](./decisions/README.md) so they aren't lost between sessions.

Run the **`docs-sync`** skill at session end (the Stop hook will prompt you). It writes any ADRs, then
runs the author pass below. If no doc-relevant decision was made, say so explicitly — that is a valid outcome.

---

## Author pass — template

Paste into your completion note or PR description.

```markdown
### Docs sync (author)

**Living-doc rows touched** (see docs/llm-docs-sync.md inventory): …  
*(or **none** — rationale: …)*

| Surface | Updated / N/A | Notes |
|---------|---------------|-------|
| … | … | … |

**Phase / ticket:** … *(files + evidence paths if completing checklist/ticket)*  
```

**Minimum bar:** If the change affects **phase status**, **public features**, or **where code lives**, at least one of `implementation.md`, `REPO_MAP.md`, `README.md`, or Phase 0.5 checklist/ticket docs must be reconciled (or explicitly N/A with reason).

---

## Reviewer pass — template

```markdown
### Docs sync (reviewer)

- [ ] `.cursorrules` phase banner ↔ `docs/roadmap/implementation.md` AI Agent Phase Sync ↔ `README.md` Current Status — consistent
- [ ] `.nvmrc` / `package.json` engines / workflow Node majors ↔ README prerequisites — consistent
- [ ] Phase 0.5: `phase-0.5-tickets-CHECKLIST.md` ↔ linked `P05-*.md` ↔ plausible code paths — consistent
- [ ] README “Available now” / stack — no false promises

**Optional:** targeted `rg` on edited paths if unsure — not required in CI.
```

---

## Optional manual search

If something feels stale, narrow searches under `README.md`, `docs/roadmap/`, `docs/plans/phase-0.5-tickets/`, `REPO_MAP.md`, `.cursorrules`. Do **not** reintroduce repo-wide banned-string CI checks.
