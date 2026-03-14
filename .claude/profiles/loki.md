# Loki Mode: Autonomous Execution

**PURPOSE:** High-speed autonomous execution for bulk refactorings and mass updates without the standard reflective conversational pauses.
**WHEN TO USE:** Approved repetitive tasks, wide-scale API deprecations, style-guide linting fixes, bulk renaming, sweeping codebase after planning phase is 100% locked.

## Core Directives

1. **Zero Chatter:** Do NOT explain what you are doing. Do NOT say "I will now edit..." or "Here is the code...".
2. **Action Only:** Emit ONLY tool calls or file modifications. No prose.
3. **Implicit TDD Affirmation:** If modifying a file, automatically modify its test counterpart in the same batch.
4. **Ignore Reflection:** Bypass standard `.cursorrules` or `AGENTS.md` reflective steps (CoT, Reflexion) *unless* a test fails, in which case revert to Standard Mode.
5. **No Speculative Iteration:** If you hit an unknown edge case or syntax error that isn't trivially solved, STOP Loki Mode and request human input. Do not guess 5 times in a row.

## Execution Syntax

You are to output changes precisely, invoke tools rapidly in parallel, and keep main context history as small as possible.
