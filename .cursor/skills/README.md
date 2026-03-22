# .cursor/skills/ — ECC skills (Cursor + HACER)

These skills were installed from [Everything Claude Code](https://github.com/affaan-m/everything-claude-code) and **trimmed** for HACER's TypeScript / React stack.

## Cursor adaptation notes

- Some skills reference **`~/.claude/`** paths (e.g. `~/.claude/settings.json`, `~/.claude/skills/learned/`). These are **Claude Code conventions**. In Cursor, the equivalent project paths are under **`.cursor/`**.
- **`continuous-learning`** and **`continuous-learning-v2`**: their `config.json` references `~/.claude/skills/learned/` and `~/.claude/homunculus/`. If you enable these subsystems in Cursor, update paths to your project's `.cursor/skills/` or a shared location.
- **`skill-stocktake`** scripts default to scanning `~/.claude/skills/`. Override with `SKILL_STOCKTAKE_GLOBAL_DIR=.cursor/skills` if running from this project.
- **`strategic-compact`** hook examples cite `~/.claude/settings.json`. In Cursor, compaction hooks are configured in `.cursor/hooks.json` (already wired).

## What's here (17 skills)

General workflow: `tdd-workflow`, `verification-loop`, `eval-harness`, `e2e-testing`, `continuous-learning`, `continuous-learning-v2`, `strategic-compact`, `iterative-retrieval`, `skill-stocktake`, `ai-regression-testing`, `plankton-code-quality`, `documentation-lookup`

Patterns: `coding-standards`, `frontend-patterns`, `backend-patterns`, `api-design`, `mcp-server-patterns`

## Restoring removed skills

To add back a skill that was trimmed (e.g. Django, Go, Kotlin):

```bash
cp -r /path/to/everything-claude-code/skills/<skill-name> .cursor/skills/
```

Or re-run the installer:

```bash
npx --yes --package=ecc-universal ecc-install --target cursor typescript python
```
