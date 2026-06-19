---
name: docs-sync
description: Use at the end of a work session, or when the docs-sync Stop hook prompts, to capture emergent decisions/directions as ADRs and reconcile living docs so future sessions inherit them.
---

# docs-sync

Run this before wrapping up a session that changed code or made decisions.

## Steps

1. **Scan the session for decisions.** Did anything change direction, settle a trade-off, adopt or
   reject an approach, or alter an assumption recorded in the docs? List each candidate.

2. **Record each decision as an ADR.** For every material decision, create
   `docs/decisions/NNNN-kebab-title.md` from `docs/decisions/0000-template.md`
   (next zero-padded number; never renumber). Add a row to `docs/decisions/README.md`'s index.

3. **Run the author pass.** Follow the author pass in `docs/llm-docs-sync.md`: for each affected row of
   the living-documentation inventory (`REPO_MAP.md`, `docs/roadmap/*`, `README.md`, `.cursorrules`
   banner, `HACER_LLM_GUIDE.md`, `.github/copilot-instructions.md`), update it or mark it N/A with a reason.

4. **If no doc-relevant decision was made,** state that explicitly (e.g. "No ADR — this session was a
   routine bugfix, living docs unaffected"). That is a valid, complete outcome.

5. **Verify.** `git status` should show your ADR and any living-doc edits staged together with the code.

## Notes
- This is the capture half of the enforcement loop; the Stop hook (`scripts/hooks/docsSyncStop.mjs`) is
  the reminder half. Touching any doc (or adding an ADR) satisfies the hook for the session.
- Do NOT add repo-wide grep-CI for banned strings — `docs/llm-docs-sync.md` deliberately forbids it.
