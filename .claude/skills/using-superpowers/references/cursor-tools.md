# Cursor Tool Mapping

Skills use Claude Code tool names. When you encounter these in a skill, use your Cursor equivalents:

| Skill references | Cursor equivalent |
|-----------------|-------------------|
| `Task` tool (dispatch subagent) | `mcp_task` |
| `Task` with `subagent_type` | `mcp_task` with `subagent_type: "explore"` or `"generalPurpose"` |
| `superpowers:code-reviewer` | `mcp_task` with `subagent_type: "generalPurpose"` and the code-reviewer prompt from `requesting-code-review/code-reviewer.md` as the task description |
| `TodoWrite` (task tracking) | `TodoWrite` (native) |
| `Skill` tool (invoke a skill) | Read skill file via `Read` tool; skills load via agent_skills |
| `Read`, `Write`, `Edit` (files) | Use native file tools |
| `Bash` (run commands) | `Shell` or terminal |

## Subagent Types

Cursor's `mcp_task` supports:
- `subagent_type: "explore"` — codebase exploration, narrow searches
- `subagent_type: "generalPurpose"` — multi-step tasks, code review, implementation
- `subagent_type: "shell"` — git, commands
- `subagent_type: "ci-watcher"` — CI monitoring

There is no `code-reviewer` subagent type. Use `generalPurpose` with the code-reviewer prompt template filled in as the `prompt` parameter.
