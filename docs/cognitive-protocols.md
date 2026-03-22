# Cognitive Protocols (from AI Research)

These protocols are derived from six foundational papers on LLM reasoning and agent behavior. Follow them on every non-trivial task.

## ReAct (Reason + Act + Observe)
*Source: [Yao et al., 2022](https://arxiv.org/abs/2210.03629)*

Before every tool call or code change:
1. **Reason**: State what you believe is true and why
2. **Act**: Execute the smallest possible action to test the belief
3. **Observe**: Read the actual output; update your belief

> Never act without reasoning. Never assume the output without observing.

## Chain-of-Thought
*Source: [Wei et al., 2022](https://arxiv.org/abs/2201.11903)*

Break every multi-step problem into explicit numbered intermediate steps. Write them out. Do not skip steps mentally. "Think step by step" is not a slogan — it is the execution model.

## Tree-of-Thoughts
*Source: [Yao et al., 2023](https://arxiv.org/abs/2305.10601)*

Before committing to any approach, **propose 2–3 alternatives** with trade-offs. Evaluate them explicitly. Pick the best one. Do not take the first idea that sounds reasonable.

## Reflexion
*Source: [Shinn et al., 2023](https://arxiv.org/abs/2303.11366)*

After any correction from the user, or any bug you caused, write a short lesson to `tasks/lessons.md`. Re-read lessons at session start. Verbal reflection without code changes is not enough — **capture it in writing**.

## Generative Agents (Memory Model)
*Source: [Park et al., 2023](https://arxiv.org/abs/2304.03442)*

Treat context as a memory hierarchy:
- **Working memory** → `.claude/CLAUDE.md` when using Claude Code; **Cursor:** chat + `.cursor/AGENTS.md` for ECC hints
- **Semantic memory** → `.claude/skills/*.md` (Claude Code) or **`.cursor/skills/`** (Cursor / project)
- **Episodic memory** → `tasks/lessons.md` (past events, reviewed at session start)
- **Long-term plan** → `docs/plans/` (implementation plans, persisted in git)

## Toolformer (Tool Selection)
*Source: [Schick et al., 2023](https://arxiv.org/abs/2302.04761)*

Use the cheapest tool that gets the job done. Tool use has costs (tokens, latency, side-effects):
- Reading a file → use `view` or `grep`, not `bash cat`
- Finding a pattern → use `grep`, not opening every file
- Running tests → `pnpm run test:run` for fast, `pnpm run test:e2e:store` for store, full suite only when needed
- Exploring directories → `glob`, not `find`
