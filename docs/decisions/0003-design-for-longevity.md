# 0003. Design for long-term extensibility over near-term expedience

- **Status:** Accepted
- **Date:** 2026-06-19
- **Deciders:** Repo owner
- **Phase:** Phase 0.5 (standing principle, all phases)

## Context
HACER's North Star is to start simple and grow ever more complex and configurable — downward below the
NAND gate, upward to higher architectures, with plugins and AI-native extension. Design decisions made
for near-term convenience (shortcuts that flatten information or hard-code assumptions) accumulate as
barriers to that growth. This surfaced concretely while choosing how the HDL compiler (P05-16) should
represent a compiled chip.

## Decision
A standing design directive for all work: **favor extensibility, configurability, and scalability over
near-term expedience.** Build clean, well-defined seams (interfaces, dispatchers, registries) so new
capabilities slot in without rework. When the quick option and the extensible option diverge, choose
extensible. This complements — does not override — Simplicity & Elegance and YAGNI: keep it simple and
don't build unused features, but never take a shortcut that forecloses the project's documented growth.

## Consequences
- Codified as a Prime Directive in `.claude/CONSTITUTION.md`; agents apply it to architectural choices.
- Example application (P05-16): compiled HDL chips retain their `type:'hdl'` source/AST identity
  (serializable, editable, AI-readable) and evaluate through a single extensible `evaluateChip`
  dispatcher, rather than being flattened into anonymous `builtin` closures for short-term convenience.
- Reviews should check that decisions preserve future growth, not just pass today's tests.

## Affected living docs
`.claude/CONSTITUTION.md` (new Prime Directive) — updated alongside this ADR.

## Links
- [[0001-adopt-adr-log-and-docs-sync-enforcement]], [[0002-commit-and-worktree-conventions]]
- Vision: `docs/roadmap/vision.md`
