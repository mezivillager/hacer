#!/usr/bin/env node
// Structural doc drift: repo-relative paths cited in a doc that do not exist in the tree.
// Usage: node doc-drift.mjs <repo-root> <doc.md> [doc.md...]
import fs from 'node:fs';
import path from 'node:path';
const root = process.argv[2];
// backtick-quoted paths that look like repo paths (contain a / or end in a known extension)
const RE = /`([A-Za-z0-9_@.\-][A-Za-z0-9_@./\-*]*\/[A-Za-z0-9_@./\-*]*|[A-Za-z0-9_.\-]+\.(ts|tsx|md|json|mjs|js|sh|yml|yaml|css|html))`/g;
const out = [];
for (const doc of process.argv.slice(3)) {
  const text = fs.readFileSync(path.join(root, doc), 'utf8');
  const lines = text.split('\n');
  const cited = new Map(); // path -> first line
  lines.forEach((l, i) => {
    let m; RE.lastIndex = 0;
    while ((m = RE.exec(l))) {
      let p = m[1];
      if (/^(https?|pnpm|npm|node|git|gh|npx)/.test(p)) continue;
      if (p.includes('*') || p.includes(' ')) continue;
      p = p.replace(/\/$/, '');
      if (!cited.has(p)) cited.set(p, i + 1);
    }
  });
  const dead = [], live = [];
  const exts = ['', '.ts', '.tsx', '.md', '/index.ts', '/index.tsx'];
  for (const [p, line] of cited) {
    // resolve the @/ alias to src/; a bare filename with no directory is an example, not a citation
    const cand = p.startsWith('@/') ? 'src/' + p.slice(2) : p;
    if (!cand.includes('/')) continue;
    const ok = exts.some((e) => fs.existsSync(path.join(root, cand + e)));
    (ok ? live : dead).push({ p, resolved: cand, line });
  }
  out.push({ doc, cited: cited.size, live: live.length, dead: dead.length, deadList: dead });
}
console.log(JSON.stringify(out, null, 2));
