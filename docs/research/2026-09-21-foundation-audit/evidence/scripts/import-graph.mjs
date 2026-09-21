#!/usr/bin/env node
// Build the import graph of src/ from a hacer checkout.
// Usage: node import-graph.mjs <repo-root> [--json out.json]
// Emits JSON on stdout: { files: {path: {loc, imports: [{spec, resolved, typeOnly, line, kind}]}} }
import fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2];
if (!root) { console.error('usage: import-graph.mjs <repo-root>'); process.exit(1); }
const SRC = path.join(root, 'src');

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

const files = walk(SRC).sort();
const rel = (p) => path.relative(root, p).split(path.sep).join('/');

// Resolve a module specifier to a file inside src/, or null if external.
function resolve(fromFile, spec) {
  let base;
  if (spec.startsWith('@/')) base = path.join(SRC, spec.slice(2));
  else if (spec.startsWith('.')) base = path.resolve(path.dirname(fromFile), spec);
  else return null; // bare / external
  const cands = [
    base, base + '.ts', base + '.tsx', base + '.d.ts',
    path.join(base, 'index.ts'), path.join(base, 'index.tsx'),
    base + '.js', base + '.jsx', base + '.css',
  ];
  for (const c of cands) {
    try { if (fs.statSync(c).isFile()) return c; } catch { /* nope */ }
  }
  return base; // unresolved-but-internal-looking
}

// Matches: import ... from 'x';  import 'x';  export ... from 'x';  import('x')
const IMPORT_RE =
  /(?:^|\n)\s*(import|export)\s+(type\s+)?([^;'"]*?\bfrom\s+)?['"]([^'"]+)['"]|(?:\bimport\s*\(\s*['"]([^'"]+)['"]\s*\))|(?:\brequire\s*\(\s*['"]([^'"]+)['"]\s*\))/g;

const graph = {};
for (const f of files) {
  const text = fs.readFileSync(f, 'utf8');
  const lines = text.split('\n');
  const loc = lines.length;
  const imports = [];
  let m;
  IMPORT_RE.lastIndex = 0;
  while ((m = IMPORT_RE.exec(text))) {
    const spec = m[4] ?? m[5] ?? m[6];
    if (!spec) continue;
    const idx = m.index;
    const line = text.slice(0, idx).split('\n').length + (m[0].startsWith('\n') ? 1 : 0);
    const stmt = m[0];
    // type-only if `import type` / `export type`, or every named binding is `type X`
    const wholeTypeOnly = !!m[2];
    const clause = m[3] ?? '';
    const named = clause.match(/\{([^}]*)\}/);
    let allNamedType = false;
    if (named && !wholeTypeOnly) {
      const parts = named[1].split(',').map((s) => s.trim()).filter(Boolean);
      allNamedType = parts.length > 0 && parts.every((p) => /^type\s/.test(p))
        && !/^\s*\w[\w$]*\s*,/.test(clause); // no default binding before {}
    }
    const typeOnly = wholeTypeOnly || allNamedType;
    const resolved = resolve(f, spec);
    imports.push({
      spec,
      resolved: resolved && resolved.startsWith(SRC) ? rel(resolved) : null,
      external: !resolved,
      typeOnly,
      line,
      kind: m[1] === 'export' ? 'reexport' : (m[5] ? 'dynamic' : m[6] ? 'require' : 'import'),
      stmt: stmt.trim().replace(/\s+/g, ' ').slice(0, 160),
    });
  }
  graph[rel(f)] = { loc, imports };
}

process.stdout.write(JSON.stringify({ commit: process.env.COMMIT || '', files: graph }, null, 0));
