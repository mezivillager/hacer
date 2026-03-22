# LLM harness efficiency (multi-platform + HACER)

How to keep agents fast, cheap, and aligned with this repo — across Cursor, Claude Code, Codex, and other harnesses.

## Rule & doc precedence

See **`.cursor/rules/000-hacer-precedence.mdc`** (Cursor `alwaysApply`). In short: **`.cursorrules` + root `AGENTS.md` + `HACER_LLM_GUIDE.md`** beat generic ECC material under `.cursor/`.

Other harnesses read the same root `AGENTS.md` and `.cursorrules`; see `AGENTS.md` §0 for the full precedence chain.

## Cross-platform ECC layout

The `.cursor/` tree contains configs for **multiple harnesses** (this is [by design](https://github.com/affaan-m/everything-claude-code)):

| Subdirectory | Used by | Keep? |
|--------------|---------|-------|
| `rules/`, `commands/`, `skills/`, `agents/`, `hooks/`, `hooks.json` | **Cursor** | Yes — trimmed for TypeScript / HACER |
| `.opencode/` | **OpenCode** | Yes — cross-platform |
| `.codex/` | **Codex** (macOS app + CLI) | Yes — cross-platform |
| `.claude-plugin/` | **Claude Code** plugin loader | Yes — cross-platform |
| `.agents/skills/` | **Codex** / OpenAI agents | Yes — cross-platform (full ECC skill set for non-Cursor harnesses) |
| `mcp-configs/`, `scripts/` | Shared utilities | Yes |

**Do not delete** `.opencode/`, `.codex/`, `.claude-plugin/`, or `.agents/` — they enable opening this repo in other tools.

## MCP servers

- Each enabled MCP consumes **context** (tool descriptions).
- Disable servers you are not using for HACER work (Cursor MCP settings / project config).
- Prefer **fewer, high-signal** tools over "enable everything."

## ECC hooks (`.cursor/hooks.json`)

Hooks run on Cursor events. Full list:

| Event | Script | What it does |
|-------|--------|--------------|
| `sessionStart` | `session-start.js` | Load previous context, detect environment |
| `sessionEnd` | `session-end.js` | Persist session state, evaluate patterns |
| `beforeShellExecution` | `block-no-verify` + `before-shell-execution.js` | Block `--no-verify`, tmux reminder, git push review |
| `afterShellExecution` | `after-shell-execution.js` | PR URL logging, build analysis |
| `afterFileEdit` | `after-file-edit.js` | Auto-format, TypeScript check, console.log warning |
| `beforeMCPExecution` | `before-mcp-execution.js` | MCP audit logging, untrusted server warning |
| `afterMCPExecution` | `after-mcp-execution.js` | MCP result logging |
| `beforeReadFile` | `before-read-file.js` | Warn on sensitive files (.env, .key, .pem) |
| `beforeSubmitPrompt` | `before-submit-prompt.js` | Detect secrets in prompts (sk-, ghp_, AKIA) |
| `subagentStart` | `subagent-start.js` | Log agent spawning |
| `subagentStop` | `subagent-stop.js` | Log agent completion |
| `beforeTabFileRead` | `before-tab-file-read.js` | Block Tab from reading secrets |
| `afterTabFileEdit` | `after-tab-file-edit.js` | Auto-format Tab edits |
| `preCompact` | `pre-compact.js` | Save state before compaction |
| `stop` | `stop.js` | Console.log audit on modified files |

**CJS compatibility:** HACER uses `"type": "module"` in `package.json`, but ECC hooks are CJS (`require()`). The `.cursor/hooks/package.json` and `.cursor/scripts/package.json` files set `"type": "commonjs"` to fix this. Do not remove them.

Optional tuning (via ECC env vars — see [upstream docs](https://github.com/affaan-m/everything-claude-code)):

```bash
export ECC_HOOK_PROFILE=minimal    # or standard (default) / strict
export ECC_DISABLED_HOOKS="sessionEnd,preCompact"  # comma-separated event names
```

## Session hygiene

- **New chat** for unrelated tasks (saves context and reduces confusion).
- Use **`REPO_MAP.md` → Common tasks** to jump to the right files instead of broad search.
- After large exploration, **summarize** decisions in `tasks/todo.md` or the active plan in `docs/plans/`.
- **Skip these unless needed** (saves context): `.cursor/mcp-configs/`, `.cursor/scripts/`, `.cursor/.opencode/`, `.cursor/.codex/`, `.cursor/.claude-plugin/`, `.cursor/.agents/`, `docs/roadmap/implementation.md` (for phase checks only).

## Executable specs (tests)

Treat these as ground truth for behavior:

| Area | Example spec files |
|------|---------------------|
| Store / gates | `src/store/actions/**/*.test.ts` |
| Simulation | `src/simulation/gateLogic.test.ts` |
| E2E store | `e2e/specs/**/*.store.spec.ts` |

Add or extend tests when behavior is easy to misread from prose alone.
