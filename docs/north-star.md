# North Star — keep this in mind for every plan and suggestion

> Moved into the repo on 2026-09-18 so cloud sessions and routines see it; the workspace `CLAUDE.md` now points here. Owner intent, not a spec: the parts marked "beyond current docs" are forward intent.

HACER ("Hardware Architecture and Constraints Explorer & Researcher") is a first-principles computing platform: build a working computer from a single NAND gate up through a full software stack, in an interactive 3D environment. Inspired by nand2tetris — and meant to outgrow it.

The owner's explicit ask: **every session should reason and propose with the greater goal in view**, not just the immediate ticket. When you plan, suggest, or design, serve the current near-term phase *while* staying compatible with the long arc below.

**Documented vision** (`docs/roadmap/vision.md`):
- **nand2tetris as a compatibility baseline, then beyond it** — native `.hdl/.tst/.cmp/.hack/.vm/.jack`, the 12 reference projects, then custom hardware architectures, custom instruction sets, and new languages.
- **AI-Agent Parity** — *every action a human can take, an AI agent can take programmatically.* AI is a first-class user for design, optimization, autonomous building, and tutoring/explaining (dedicated Tutor/Debug agent types; full Agent API is the future Phase 7).
- **Progressive complexity + plugin-first extensibility** — start narrow and grow (Beginner→Creator); renderers, agents, analyzers, and tools plug into stable APIs. "Start simple, grow more complex and more configurable over time."

**Owner's North Star that goes *beyond* current docs** (treat as forward intent, not as something the roadmap already specifies — don't go hunting for docs that don't exist):
- **Extend downward, below the NAND gate** — toward transistors / device physics. (Docs today treat NAND as the floor; the only adjacent note is far-future FPGA bitstream synthesis in `appendices.md`.)
- **Explicitly AI-native** — AI assists circuit design/optimization, builds the system autonomously, and teaches by building and showcasing. (Docs frame this as "AI-Agent Parity"; the broader "AI-native" ambition is the owner's.)
- **A vehicle for master's/PhD-level AI-assisted hardware-development research** — not just an academic tool but a real research lab for enthusiasts and builders. (Not in the docs; it's the owner's driving purpose.)

**Roadmap shape:** fractional product phases are the real near-term ladder. **Current: Phase 0.5 — nand2tetris Project 1 foundation (in progress)** → 0.6 Arithmetic & Sequential (Projects 2–3) → 0.7 Computer Architecture (Projects 4–5). Platform phases (5–24: core architecture, plugins, AI integration, software stack, collaboration, …) are explicitly **not** to supersede the 0.5→0.7 product spine. Always confirm the current phase in `.cursorrules` → "Phase Tracking" and implement for the current phase only.


## How work is chosen

`docs/portfolio.md` holds the ordered priority projects and the pick rule; tasks are GitHub Issues under the epics. The research behind the current structure: `docs/research/2026-09-18-agent-readiness/`.
