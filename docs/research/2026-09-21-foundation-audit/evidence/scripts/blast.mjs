#!/usr/bin/env node
// Blast radius: for a set of seed files, the reverse-dependency closure (who would have to be
// re-read / re-verified if the seed's shape changes) and the layers it spans.
// Usage: node blast.mjs <graph.json> <seed> [seed...]     (seeds are repo-relative paths or prefixes)
import fs from 'node:fs';
const g = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')).files;
const seeds = process.argv.slice(3);
const isTest = (f) => /\.test\.(ts|tsx)$/.test(f) || f.startsWith('src/test/');
const layerOf = (f) => {
  if (/^src\/(simulation|core)\//.test(f)) return 'pure';
  if (/^src\/store\//.test(f)) return 'state';
  if (/^src\/(components|gates|nodes|hooks|theme|styles)\//.test(f) || /^src\/(App|main)\.tsx$/.test(f)) return 'ui';
  return 'shared';
};
const rev = new Map();
for (const f of Object.keys(g)) rev.set(f, new Set());
for (const [f, d] of Object.entries(g)) for (const i of d.imports) if (i.resolved && rev.has(i.resolved)) rev.get(i.resolved).add(f);

const start = Object.keys(g).filter((f) => seeds.some((s) => f === s || f.startsWith(s)));
// depth-1 and transitive closures
const d1 = new Set(); for (const s of start) for (const r of rev.get(s) || []) d1.add(r);
const seen = new Set(start); const q = [...start];
while (q.length) { const n = q.shift(); for (const r of rev.get(n) || []) if (!seen.has(r)) { seen.add(r); q.push(r); } }
const closure = [...seen].filter((f) => !start.includes(f));
const byLayer = (arr) => arr.reduce((a, f) => { const k = layerOf(f) + (isTest(f) ? '/test' : ''); a[k] = (a[k] || 0) + 1; return a; }, {});
console.log(JSON.stringify({
  seeds, seedFiles: start.length, seedFileList: start,
  directImporters: d1.size, directImportersByLayer: byLayer([...d1]), directImporterList: [...d1].sort(),
  transitiveClosure: closure.length, closureByLayer: byLayer(closure),
  seedLoc: start.reduce((a, f) => a + g[f].loc, 0),
  directLoc: [...d1].reduce((a, f) => a + g[f].loc, 0),
}, null, 2));
