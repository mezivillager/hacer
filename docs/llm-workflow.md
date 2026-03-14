# LLM Workflow Orchestration

**PURPOSE**: Guide AI agents (Cursor, Claude Code) through structured task execution, verification, and self-improvement.  
**SCOPE**: Workflow orchestration, task management, and core principles for all non-trivial development work.

> **Primary entry point for all agents: [AGENTS.md](../AGENTS.md)**  
> AGENTS.md explains the CI quality enforcement model, cognitive protocols from research papers,
> and the mandatory Design → Plan → TDD → Debug → Review workflow.  
> This document provides additional workflow details and ties into HACER-specific practices.

> **Related Documentation:**
> - [AGENTS.md](../AGENTS.md) - Universal guide (start here)
> - [HACER_LLM_GUIDE.md](../HACER_LLM_GUIDE.md) - Project-specific patterns, React, testing, Zustand
> - [.cursorrules](../.cursorrules) - Quick rules, phase tracking, TDD protocol
> - [docs/testing/](./testing/) - TDD workflow, test standards, templates

---

## Workflow Orchestration

### 1. Plan Node Default

- **Mandatory Planning**: Enter plan mode for *any* non-trivial task (defined as 3+ steps or architectural decisions).
- **Dynamic Re-planning**: If the task deviates from the plan, immediately STOP and re-plan rather than pushing forward with a flawed approach.
- **Comprehensive Planning**: Use plan mode not just for building, but also for verification steps.
- **Clarity**: Write detailed specifications upfront to minimize ambiguity.

### 2. Subagent Strategy

- **Context Management**: Use subagents liberally to maintain a clean main context window.
- **Offloading**: Delegate research, exploration, and parallel analysis to subagents.
- **Resource Allocation**: For complex problems, increase computational power by employing more subagents.
- **Focused Execution**: Assign one specific task ("task") per subagent for precise and focused execution.

**When to dispatch a subagent:**
- Codebase exploration (e.g., "how does auth work?", "find all usages of X")
- Parallel analysis (e.g., investigate multiple areas simultaneously)
- Code review in a fresh context (avoids bias toward code you just wrote)
- Narrow-scope research that would otherwise read many files into main context

**How to dispatch:**
- **Cursor**: Use `mcp_task` with `subagent_type: "explore"` for research; `subagent_type: "generalPurpose"` for multi-step tasks. Provide a focused prompt with exact scope.
- **Claude Code**: "Use subagents to investigate X" or "Use a subagent to review this code for edge cases." Subagents run in separate context and report back summaries.

**Anti-pattern:** Unscoped "investigate" prompts that read hundreds of files. Always scope narrowly or split into multiple focused subagent tasks.

### 3. Self-Improvement Loop

- **Learning from Corrections**: After *any* correction from the user, update [tasks/lessons.md](../tasks/lessons.md) with the identified pattern or mistake.
- **Rule Formulation**: Create personal rules to prevent the recurrence of the same mistakes.
- **Iterative Improvement**: Ruthlessly iterate on these learned lessons until the mistake rate drops.
- **Pre-session Review**: Review relevant lessons at the start of each project session.

### 4. Verification Before Done

- **Proof of Work**: Never mark a task as complete without concrete proof that it functions correctly.
- **Behavioral Diff**: When relevant, analyze and understand the differences in behavior between the `main` branch/original state and your changes.
- **Quality Standard**: Ask yourself: "Would a staff engineer approve this?"
- **Demonstration**: Run tests, check logs, and actively demonstrate the correctness of the solution.

### 5. Demand Elegance (Balanced)

- **Refinement for Complexity**: For non-trivial changes, pause and consider if there is a more elegant solution.
- **Elegant Fixes**: If a fix feels "hacky," commit to implementing the most elegant solution based on current knowledge.
- **Avoid Over-engineering**: Skip this pursuit of elegance for simple, obvious fixes.
- **Self-Review**: Challenge your own work critically before presenting it.

### 6. Autonomous Bug Fixing

- **Direct Resolution**: When given a bug report, fix it directly without requiring additional guidance or hand-holding.
- **Diagnostic Skills**: Utilize logs, error messages, and failing tests to pinpoint and resolve issues.
- **Seamless Workflow**: Aim for zero context switching required from the user.
- **Proactive CI Fixes**: Address failing Continuous Integration (CI) tests without explicit instructions.

### 7. Prompt Caching (Cookbook Standard)

When running deep implementation loops or extended Context sessions, use explicit structural markers to trigger API-level prompt caching:
- Always load `AGENTS.md`, `.claude/CONSTITUTION.md`, and static design specs EARLY in the conversation so they cache effectively.
- Use XML tags (`<instructions>`, `<examples>`, `<context>`) in dynamic prompts to boundary-separate static rule-sets from dynamic request payloads.
- Periodically clear context and re-load just the relevant static context instead of carrying hours of conversational garbage into new prompts.

### 8. Loki Mode Workflows

When bulk refactoring or executing trivial, high-confidence plan sweeps:
- Apply `.claude/profiles/loki.md` via `system-prompt` or contextual injection to execute modifications silently.
- Expect high-speed patching without conversational reflection; fallback to standard `ReAct` only on CI/Test failure.

---

## By Platform

| Platform | Plan mode | Subagents | Context management |
|---------|-----------|-----------|---------------------|
| **Cursor** | Plan mode (built-in) | `mcp_task` with `subagent_type: "explore"` or `"generalPurpose"` | Start fresh sessions for unrelated tasks |
| **Claude Code** | Plan Mode (`Ctrl+G`), `/plan` | "Use subagents to investigate X" | `/clear`, `/compact` between tasks |
| **GitHub Copilot** | Follows prompts | N/A | Uses [.github/copilot-instructions.md](../.github/copilot-instructions.md) for repo context |

---

## Task Management

Use [tasks/todo.md](../tasks/todo.md) and [tasks/lessons.md](../tasks/lessons.md) to manage work and capture learning.

1. **Plan First**: Write a plan into `tasks/todo.md` using checkable items.
2. **Verify Plan**: Thoroughly check the plan before commencing with the implementation.
3. **Track Progress**: Mark items as complete in `tasks/todo.md` as progress is made.
4. **Explain Changes**: Provide a high-level summary of the changes at each step.
5. **Document Results**: Add a review section to `tasks/todo.md` upon completion.
6. **Capture Lessons**: After any corrections or feedback, update `tasks/lessons.md`.

---

## Core Principles

- **Simplicity First**: Prioritize making every change as simple as possible, aiming for minimal impact on the codebase.
- **No Laziness**: Emphasize finding and addressing the root causes of issues, avoiding temporary fixes, and adhering to senior developer standards.
- **Minimal Impact**: Ensure that changes only affect what is strictly necessary, thereby avoiding the introduction of new bugs.

---

## HACER-Specific Tie-ins

| Practice | HACER Integration |
|----------|-------------------|
| **Verification** | Run `pnpm run test:run`, `pnpm run test:e2e:store`, `pnpm run lint`, `pnpm run typecheck` before marking done. See [.cursorrules](../.cursorrules) AI Agent Completion Checklist. |
| **TDD** | Follow [docs/testing/](./testing/) — write tests first, Red-Green-Refactor. |
| **Elegance** | Follow [HACER_LLM_GUIDE.md](../HACER_LLM_GUIDE.md) patterns; avoid anti-patterns. |
| **Bug Fixing** | Use store tests (`pnpm run test:e2e:store`) for fast iteration; fix CI without being asked. |
