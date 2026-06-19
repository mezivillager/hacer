# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Pointer file.** Sessions normally run from the parent workspace (`slow/`), whose `../CLAUDE.md` carries the cross-repo orientation, the project North Star, and the verified architecture overview. **If you opened a session directly in `hacer/`, read `../CLAUDE.md` first when it exists.** This file is a thin signpost so nothing is lost when `hacer/` is opened in isolation.

## Canonical entry docs (this repo)

These are authoritative for any operational detail — start here:

1. `AGENTS.md` — workflow, CI quality gates, cognitive protocols, definition-of-done.
2. `.claude/CLAUDE.md` — Claude-specific entry point and skill map.
3. `.cursorrules` — stack rules, **current phase** (check "Phase Tracking"), TDD protocol.
4. `HACER_LLM_GUIDE.md` — code patterns/examples. `REPO_MAP.md` — file layout & "add X" jump table.
5. `docs/decisions/` — ADR log of emergent decisions; run the `docs-sync` skill at session end.

## North Star (don't lose sight of it)

HACER is a first-principles, **AI-native** computing platform — build a computer from one NAND gate up, in 3D — inspired by nand2tetris and meant to outgrow it. The owner's driving purpose: a research lab for **master's/PhD-level AI-assisted hardware development**, aspiring to extend **downward below the NAND** (toward transistors/physics) and **upward** to higher architectures, growing slowly and ever more configurable. Propose and plan with that arc in mind, not just the immediate ticket. Full framing + which parts are documented vs. owner-intent: `../CLAUDE.md`.

## Definition of done (all must exit 0)

`pnpm run lint` · `pnpm run test:run` · `pnpm run test:e2e:store` · `pnpm run build`
