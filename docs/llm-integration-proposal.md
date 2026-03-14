# LLM Workflow Integration Proposal

**PURPOSE**: Integrate best practices from the "Complete Claude AI Learning Document" into a reusable workflow that works not just for HACER but for any software repo.  
**STATUS**: ✅ Alternative A implemented (2025-03).

---

## Implementation Summary

| Artifact | Location |
|----------|----------|
| Universal agent entry point | [AGENTS.md](../AGENTS.md) |
| GitHub Copilot instructions | [.github/copilot-instructions.md](../.github/copilot-instructions.md) |
| Claude Code project context | [.claude/CLAUDE.md](../.claude/CLAUDE.md) |
| Skills (brainstorming, planning, tdd, debugging, code-review, hacer-patterns) | [.claude/skills/](../.claude/skills/) |
| Spec artifacts | [docs/specs/](./specs/) |
| Plan artifacts | [docs/plans/](./plans/) |

---

## What the Resources Teach Us

After thoroughly reading all accessible content from the linked resources (obra/superpowers skill files, awesome-claude-skills, claude-cookbooks, Skill_Seekers, and the research papers), here is the consolidated knowledge:

### From the Claude Skills Ecosystem

**Core pattern: Skills** (`awesome-claude-skills`, `obra/superpowers`)

Claude Skills are folders containing a `SKILL.md` file with a YAML frontmatter `name`/`description` and detailed markdown instructions. They use **progressive disclosure**:

1. ~30–50 token metadata scan — Claude identifies relevant skills
2. Full instructions loaded on demand (< 5k tokens each)
3. Multiple skills compose automatically — never overwhelm the context window

The gold-standard **obra/superpowers** library distills these skills into a complete software development workflow:

| Skill | Trigger | Role |
|-------|---------|------|
| `brainstorming` | Before any creative work | Socratic design refinement → spec doc; **HARD-GATE: no code until design approved** |
| `writing-plans` | After spec approved | Granular implementation plan (2–5 min tasks, exact file paths, complete code, TDD steps) |
| `subagent-driven-development` | With implementation plan | Fresh subagent per task + two-stage review (spec compliance → code quality) |
| `test-driven-development` | During implementation | Iron Law: NO production code without a failing test first; RED→GREEN→REFACTOR |
| `systematic-debugging` | On any bug/failure | 4-phase root cause process; Iron Law: no fix without root cause investigation |
| `requesting-code-review` | After each task or before merge | Dispatch code-reviewer subagent with precise context |
| `using-git-worktrees` | After design approval | Isolated branch per feature |
| `finishing-a-development-branch` | When tasks complete | Verify → merge/PR/discard decision |

**Key principle from all these:** *Mandatory workflows, not suggestions.* HARD-GATEs enforce each stage.

**Skill file format:**
```yaml
---
name: skill-name
description: One-sentence trigger description (used for discovery, keep concise)
---

# Full Instructions Here
...
```

**Cross-platform compatibility:** Works identically in Claude.ai, Claude Code CLI, and Claude API. Cursor, Codex, and OpenCode support the same pattern.

---

### From the Research Papers

| Paper | Core Insight | Applied Pattern |
|-------|-------------|-----------------|
| **ReAct** (Yao et al.) | Interleave Reason→Act→Observe loops for grounded tool use | Think step-by-step *before* every tool call; cite evidence from observations |
| **Chain-of-Thought** (Wei et al.) | Explicit intermediate steps dramatically improve complex reasoning | "Think step by step" in prompts; break plans into atomic steps |
| **Tree-of-Thoughts** (Yao et al.) | Explore multiple reasoning paths, evaluate, backtrack | "Propose 2–3 approaches with trade-offs" (already in brainstorming skill) |
| **Reflexion** (Shinn et al.) | Verbal self-reflection + memory improves without gradient descent | Self-critique loops; `tasks/lessons.md` pattern (already implemented) |
| **Generative Agents** (Park et al.) | Memory (storage + retrieval) + Reflection (synthesis) + Planning | Skills for planning; lessons.md for reflection; CLAUDE.md for persistent memory |
| **Toolformer** (Schick et al.) | Learn when *not* to use tools; tool use has costs | Tool selection guidance: use bash only when grep/view can't; avoid unnecessary API calls |

---

### From Claude Code Best Practices & Guides

- **CLAUDE.md / AGENTS.md**: Primary persistent context files read automatically by Claude Code, OpenAI Codex, and GitHub Copilot respectively
- **Compact sessions**: Use `/compact` to compress context in long sessions
- **Headless/CI mode**: `claude --headless` for automation workflows
- **Git worktrees**: Isolated parallel feature development
- **Trust model**: Minimal permissions by default; request explicitly when needed

---

## Gap Analysis: HACER Today vs. Best Practices

| Best Practice | HACER Currently | Gap |
|--------------|-----------------|-----|
| Skills architecture | ❌ Flat `.cursorrules` + large HACER_LLM_GUIDE.md | No progressive disclosure; no per-workflow skills |
| AGENTS.md (universal) | ❌ Missing | OpenAI Codex, GitHub Copilot, other agents won't pick up context |
| `.github/copilot-instructions.md` | ❌ Missing | GitHub Copilot won't load project context |
| Design-before-code HARD-GATE | ⚠️ Described but not enforced | No brainstorming skill with mandatory gate |
| Spec artifacts (`docs/specs/`) | ❌ Missing | No structured spec → plan → execute artifact trail |
| Plan artifacts (`docs/plans/`) | ❌ Missing | `tasks/todo.md` is informal vs. a bite-sized plan |
| Subagent-driven development | ❌ Missing | No subagent dispatch pattern |
| Systematic debugging skill | ❌ Missing | Debugging mentioned in lessons, not a structured 4-phase process |
| TDD as enforced skill | ⚠️ In `.cursorrules` prose | Not a dedicated SKILL.md with Iron Law + rationalizations section |
| Code review skill | ❌ Missing | No subagent-dispatched code review flow |
| ReAct/CoT explicit patterns | ❌ Missing | Not embedded in guidance |
| Cross-repo portability | ❌ Everything is HACER-specific | Hard to transplant to a new repo |

---

## Four Viable Alternatives

---

### Alternative A — Claude Skills Architecture ⭐ Recommended

**What it is:** Convert all guidance into composable `.claude/skills/` files. Each workflow gets its own SKILL.md. Add `AGENTS.md` as the universal root entry point for non-Claude agents.

**New file structure:**
```
AGENTS.md                              ← universal entry point (all AI agents)
.github/
  copilot-instructions.md              ← GitHub Copilot entry point
.claude/
  CLAUDE.md                            ← (existing, update to reference skills)
  skills/
    tdd/
      SKILL.md                         ← RED→GREEN→REFACTOR Iron Law + rationalizations
    debugging/
      SKILL.md                         ← 4-phase root-cause process
      root-cause-tracing.md
    brainstorming/
      SKILL.md                         ← HARD-GATE: no code without design approval
    planning/
      SKILL.md                         ← bite-sized tasks with exact paths + TDD steps
    code-review/
      SKILL.md                         ← pre-merge dispatch pattern
    hacer-patterns/
      SKILL.md                         ← HACER-specific: stack, architecture, naming
docs/
  specs/                               ← brainstorm output artifacts
  plans/                               ← planning output artifacts
```

**What changes in existing files:**
- `.cursorrules` → slimmed to: phase tracking + pointer to skills
- `HACER_LLM_GUIDE.md` → stays but becomes the detailed reference; skills are the active workflow
- `.claude/CLAUDE.md` → updated quick-start to list skills
- `docs/llm-workflow.md` → updated to reference skills

**Portability mechanism:**  
All skills except `hacer-patterns` are 100% generic. Any repo: (1) copy `.claude/skills/` minus `hacer-patterns`, (2) create their own `{project}-patterns/SKILL.md`. Done.

**Embedding research paper patterns:**
- `brainstorming/SKILL.md`: Tree-of-Thoughts ("propose 2–3 approaches") + ReAct (observe codebase before designing)
- `planning/SKILL.md`: Chain-of-Thought (atomic steps, verify each)
- `tdd/SKILL.md`: Reflexion (watch the test fail = observing the reflection)
- `debugging/SKILL.md`: ReAct (observe → hypothesize → act → verify)
- `AGENTS.md`: Generative Agents memory model (skills = long-term memory, lessons.md = episodic)

**Effort:** ~1 day  
**Disruption:** Low — existing files stay, skills are additive

---

### Alternative B — obra/superpowers Plugin + HACER Override Skill

**What it is:** Install `obra/superpowers` as a Claude Code plugin (provides ~12 battle-tested skills out of the box). Add ONE custom skill: `hacer-patterns`. The heavy lifting is done by a maintained open-source library.

**What to add:**
```
.claude/
  skills/
    hacer-patterns/
      SKILL.md       ← React/Zustand/R3F/phase tracking/testing conventions
AGENTS.md             ← references superpowers + hacer-patterns
.github/
  copilot-instructions.md
```

**Setup in CLAUDE.md:**
```markdown
## Plugins
Install superpowers: `/plugin marketplace add obra/superpowers-marketplace && /plugin install superpowers@superpowers-marketplace`
```

**What you get from superpowers for free:** brainstorming, writing-plans, subagent-driven-development, test-driven-development, systematic-debugging, requesting-code-review, using-git-worktrees, finishing-a-development-branch, dispatching-parallel-agents, verification-before-completion

**Portability mechanism:**  
Any repo: install superpowers + create `{project}-patterns/SKILL.md`. The workflow is the same everywhere.

**Trade-offs:**
- ✅ Least maintenance (superpowers is actively maintained)
- ✅ Most powerful out of the box
- ⚠️ External dependency on `obra/superpowers`
- ⚠️ Skills live outside the repo (not in git)
- ⚠️ Requires Claude Code CLI to activate (less useful for Claude.ai or Copilot)

**Effort:** ~4 hours  
**Disruption:** Very low

---

### Alternative C — AGENTS.md Consolidation with Embedded Patterns

**What it is:** Create a single authoritative `AGENTS.md` that consolidates all principles in one place, explicitly embedding ReAct, CoT, ToT, and Reflexion patterns. No skills architecture. No external dependencies. Conservative upgrade.

**Structure of AGENTS.md:**
```markdown
# AGENTS.md — Universal AI Agent Guide

## Cognitive Protocols (from research)
- ReAct: always Think → Act → Observe; never act without thinking first
- CoT: break every multi-step task into explicit numbered steps
- ToT: propose 2-3 approaches with trade-offs before choosing
- Reflexion: after any correction, write a lesson to tasks/lessons.md

## Mandatory Workflow
1. Design (brainstorm + spec) → 2. Plan → 3. TDD implement → 4. Debug systematically → 5. Code review

## Project-Specific: HACER
...
```

**Add also:** `.github/copilot-instructions.md` (thin wrapper pointing to AGENTS.md)

**What changes:**
- `.cursorrules` → shortened; points to AGENTS.md  
- `.claude/CLAUDE.md` → points to AGENTS.md  
- `docs/llm-workflow.md` → merges into or mirrors AGENTS.md

**Portability:** Template the non-HACER sections. New repos copy/paste the universal sections.

**Effort:** ~4 hours  
**Disruption:** Medium (refactoring existing content into new structure)

---

### Alternative D — Full Stack (A + C + CI enforcement)

**What it is:** Do everything: AGENTS.md + Skills Architecture + Copilot instructions + Reusable GitHub Actions composite action for quality gates.

**Additional beyond Alternative A:**
```
.github/
  actions/
    quality-gates/
      action.yml     ← reusable composite: lint + typecheck + test + e2e:store
  copilot-instructions.md
AGENTS.md
```

**Portability:** Any repo can `uses: mezivillager/hacer/.github/actions/quality-gates@main` for the CI side, and copy `.claude/skills/` for the agent guidance side.

**Why it's more than just docs:** The CI composite action provides *automated enforcement* alongside the documented guidance.

**Effort:** ~1.5 days  
**Disruption:** Low (additive)

---

## Comparison Matrix

| | Skills Arch | superpowers | AGENTS.md only | Full Stack |
|---|---|---|---|---|
| **Effort** | ~1 day | ~4 hours | ~4 hours | ~1.5 days |
| **Cross-agent compat** | ⭐⭐⭐ High | Medium | ⭐⭐⭐ High | ⭐⭐⭐ High |
| **Portability** | ⭐⭐⭐ | ⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| **Maintenance** | Self-contained | External dep | Self-contained | Self-contained |
| **Disruption to HACER** | Low | Very Low | Medium | Low |
| **Research papers embedded** | ✅ | ✅ (via superpowers) | ✅ | ✅ |
| **Design-before-code gate** | ✅ | ✅ | ⚠️ described | ✅ |
| **Subagent patterns** | ✅ | ✅ | ⚠️ described | ✅ |
| **CI enforcement** | ❌ | ❌ | ❌ | ✅ |

---

## Recommendation

**Start with Alternative A (Skills Architecture).**

Reasons:
1. **Skills are the canonical Anthropic standard** — works in Claude.ai, Claude Code, and API; the ecosystem is growing rapidly
2. **Progressive disclosure solves the context-window problem** — `.cursorrules` + `HACER_LLM_GUIDE.md` = ~45KB always in context; skills load only when relevant
3. **All 6 research paper patterns translate naturally into skills** — each skill embeds the relevant cognitive protocol
4. **Zero external dependencies** — everything lives in the repo, versioned with git
5. **Maximum portability** — 5 of 6 skills are fully generic; only `hacer-patterns` is project-specific

**If you want minimal maintenance cost**, choose Alternative B (superpowers plugin) — you get the full workflow immediately and only maintain one file (`hacer-patterns/SKILL.md`).

**If you prefer no structural changes at all**, choose Alternative C — add AGENTS.md + copilot-instructions and call it done.

**To maximize automated enforcement across repos**, choose Alternative D.

---

## How Research Papers Map to Implementation

| Paper | Where it lives (in Alternative A) |
|-------|-----------------------------------|
| **ReAct** | `brainstorming/SKILL.md` (observe codebase first), `debugging/SKILL.md` (observe → hypothesize → act) |
| **Chain-of-Thought** | `planning/SKILL.md` (atomic numbered steps, verify each), `AGENTS.md` (explicit in cognitive protocols) |
| **Tree-of-Thoughts** | `brainstorming/SKILL.md` ("propose 2–3 approaches with trade-offs") |
| **Reflexion** | `AGENTS.md` + `tasks/lessons.md` pattern (already implemented, just formalized) |
| **Generative Agents** | Skills = long-term procedural memory; CLAUDE.md = working memory; lessons.md = episodic memory |
| **Toolformer** | `planning/SKILL.md` + `AGENTS.md` (tool selection guidance: when to use bash vs grep vs view) |

---

## Implementation Complete

Alternative A was implemented. The skills architecture, AGENTS.md, and copilot-instructions are in place. For future enhancements (e.g., subagent skill, CI composite action), see the gap remediation plan.
