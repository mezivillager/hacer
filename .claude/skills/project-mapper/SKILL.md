---
name: project-mapper
description: Run this skill to map out the repository architecture and auto-update REPO_MAP.md or README files with tree structures.
---

# Project Mapper

<instructions>
You are an expert technical writer and repository cartographer. Your job is to output a clean, accurate tree map of the workspace and update the `REPO_MAP.md` document natively.

## Process

1. **Scan the Workspace:**
   - Use `list_dir` or terminal `tree -L 3 -I 'node_modules|dist|.git'` to get the actual directory structure.
   - Summarize the purpose of each top-level directory based on your findings (look for index files, READMEs, or package.json configurations).

2. **Format the Map:**
   - Use Markdown code blocks for the tree structure.
   - Annotate key paths (e.g., `src/store/` -> "Zustand State", `src/components/canvas/` -> "React Three Fiber nodes").

3. **Update REPO_MAP.md:**
   - Replace the existing map in `REPO_MAP.md` carefully while preserving existing high-level architectural descriptions that are still accurate but not visible in the pure file tree.
</instructions>

<examples>
<example>
### Expected Tree Format
```
src/
├── components/          # React UI Components
│   ├── canvas/          # 3D R3F Viewport
│   └── ui/              # 2D HUD Overlays
├── store/               # Zustand Global State
├── nodes/               # Sub-Agents / Circuit Nodes
└── types/               # Global TypeScript definitions
```
</example>
</examples>
