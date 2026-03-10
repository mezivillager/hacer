# LLM Workflow Orchestration

**PURPOSE**: Guide AI agents (Cursor, Claude Code) through structured task execution, verification, and self-improvement.  
**SCOPE**: Workflow orchestration, task management, and core principles for all non-trivial development work.

> **Related Documentation:**
> - [HACER_LLM_GUIDE.md](../../HACER_LLM_GUIDE.md) - Project-specific patterns, React, testing, Zustand
> - [.cursorrules](../../.cursorrules) - Quick rules, phase tracking, TDD protocol
> - [docs/testing/](../../docs/testing/) - TDD workflow, test standards, templates

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
- **Focused Execution**: Assign one specific task ("tack") per subagent for precise and focused execution.

### 3. Self-Improvement Loop

- **Learning from Corrections**: After *any* correction from the user, update [tasks/lessons.md](../../tasks/lessons.md) with the identified pattern or mistake.
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

---

## Task Management

Use [tasks/todo.md](../../tasks/todo.md) and [tasks/lessons.md](../../tasks/lessons.md) to manage work and capture learning.

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
| **Verification** | Run `npm test`, `npm run test:e2e:store`, `npm run lint`, `npm run typecheck` before marking done. See [.cursorrules](../../.cursorrules) AI Agent Completion Checklist. |
| **TDD** | Follow [docs/testing/](../../docs/testing/) — write tests first, Red-Green-Refactor. |
| **Elegance** | Follow [HACER_LLM_GUIDE.md](../../HACER_LLM_GUIDE.md) patterns; avoid anti-patterns. |
| **Bug Fixing** | Use store tests (`npm run test:e2e:store`) for fast iteration; fix CI without being asked. |
