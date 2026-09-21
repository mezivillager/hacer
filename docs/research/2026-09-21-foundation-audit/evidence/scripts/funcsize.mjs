#!/usr/bin/env node
// Function-size distribution for src/ prod files, by brace-depth scan (no TS dep).
// Counts top-level `function f(`, `export function f(`, `const f = (…) =>` and object-literal
// methods at depth 1 inside a slice factory. Approximate but reproducible.
// Usage: node funcsize.mjs <repo-root>
import fs from 'node:fs';
import path from 'node:path';
const root = process.argv[2];
const SRC = path.join(root, 'src');
const walk = (d, o = []) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p, o); else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\./.test(e.name)) o.push(p); } return o; };
const HEAD = /^\s*(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:function\s+(\w+)|const\s+(\w+)\s*(?::[^=]+)?=\s*(?:async\s*)?\(|(\w+)\s*(?:<[^>]*>)?\s*\([^)]*\)\s*(?::[^{=]+)?\s*(?:=>\s*)?\{)/;
const rows = [];
for (const f of walk(SRC)) {
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  let i = 0;
  while (i < lines.length) {
    const m = HEAD.exec(lines[i]);
    const name = m && (m[1] || m[2] || m[3]);
    if (name && /[{(]/.test(lines[i])) {
      // find the opening brace then match to close
      let depth = 0, started = false, j = i, guard = 0;
      for (; j < lines.length && guard < 4000; j++, guard++) {
        for (const ch of lines[j]) { if (ch === '{') { depth++; started = true; } else if (ch === '}') depth--; }
        if (started && depth <= 0) break;
      }
      const len = j - i + 1;
      if (len > 1) rows.push({ file: path.relative(root, f).split(path.sep).join('/'), line: i + 1, name, len });
      i = Math.max(j + 1, i + 1);
    } else i++;
  }
}
const lens = rows.map((r) => r.len).sort((a, b) => a - b);
const p = (q) => lens[Math.min(lens.length - 1, Math.floor(q * (lens.length - 1)))];
console.log(JSON.stringify({
  count: rows.length, p50: p(0.5), p90: p(0.9), p99: p(0.99), max: lens.at(-1),
  over100: rows.filter((r) => r.len > 100).length, over200: rows.filter((r) => r.len > 200).length,
  largest: rows.sort((a, b) => b.len - a.len).slice(0, 20),
}, null, 2));
