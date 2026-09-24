# 0021. Vendored nand2tetris vectors stay CC BY-NC-SA 3.0

- **Status:** Accepted
- **Date:** 2026-09-24
- **Deciders:** implementation of [#193](https://github.com/mezivillager/hacer/issues/193)
- **Phase:** Phase 0.5

## Context

The conformance oracle needs the official Project 1 `.hdl` / `.tst` / `.cmp` text, taken from
the public web-ide checkout at a pinned commit. web-ide's own `LICENSE` is MIT (Copyright 2022
David Souther et al.). That licence covers the IDE. The vector text is course material: every
file header names www.nand2tetris.org and the book by Nisan and Schocken, and
[nand2tetris.org/license](https://www.nand2tetris.org/license) states that all Nand to Tetris
materials and tools are under CC BY-NC-SA 3.0.

## Reuse considered

| Candidate | Licence | Verdict | Date |
|-----------|---------|---------|------|
| nand2tetris/web-ide string modules (`hdl` / `tst` / `cmp`) | MIT for the IDE; the extracted text is CC BY-NC-SA 3.0 | adopt the text, record both licences | 2026-09-24 |
| Relicense the extracted text as MIT because the IDE is MIT | would mis-state the rights holders' terms | reject | 2026-09-24 |

## Decision

`scripts/sync-vectors.sh` clones `https://github.com/nand2tetris/web-ide.git` at the commit named
in `scripts/sync-vectors.logic.mjs` and writes `conformance/vectors/`. The notice at
`conformance/vectors/LICENSE` records that commit and states that the vector files remain under
Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported. HACER's MIT licence does not
cover them. `conformance/vectors/` is a protected path. This slice vendors Project 1 only.

## Consequences

Downstream commercial use is not granted for these files. Projects 2–5 are the same materials and
must ship under the same notice. #151 still owns the sticky tamper comment for the wider
protected-path list; the hygiene check already warns when this tree changes.

## Affected living docs

`REPO_MAP.md` updated. Roadmap, README, `.cursorrules`, and `HACER_LLM_GUIDE.md` unchanged: the
oracle is a new path, not a phase or stack change.

## Links

[#193](https://github.com/mezivillager/hacer/issues/193), `scripts/sync-vectors.sh`,
`conformance/vectors/LICENSE`
