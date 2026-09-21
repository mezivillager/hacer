#!/usr/bin/env node
// Fan-in / fan-out, file sizes, store-reach, deep imports, entry points.
// Usage: node metrics.mjs <graph.json> <repo-root>
import fs from 'node:fs';
import path from 'node:path';

const g = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')).files;
const root = process.argv[3];
const isTest = (f) => /\.test\.(ts|tsx)$/.test(f) || f.startsWith('src/test/');

// ---- fan-in / fan-out (prod files only, internal edges) ----
const fanOut = new Map(), fanIn = new Map();
for (const f of Object.keys(g)) { fanOut.set(f, new Set()); fanIn.set(f, new Set()); }
for (const [f, d] of Object.entries(g)) {
  if (isTest(f)) continue;
  for (const i of d.imports) {
    if (!i.resolved || !g[i.resolved] || i.resolved === f) continue;
    fanOut.get(f).add(i.resolved);
    fanIn.get(i.resolved).add(f);
  }
}
const prod = Object.keys(g).filter((f) => !isTest(f));
const top = (m, n = 15) => prod.map((f) => [f, m.get(f).size, g[f].loc]).sort((a, b) => b[1] - a[1]).slice(0, n);

// ---- file sizes ----
const pct = (arr, p) => { const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))]; };
const prodLocs = prod.map((f) => g[f].loc);
const testFiles = Object.keys(g).filter(isTest);
const testLocs = testFiles.map((f) => g[f].loc);
const allLocs = Object.keys(g).map((f) => g[f].loc);

// ---- store reach ----
const storeImporters = { byLayer: {}, files: [] };
const layerOf = (f) => {
  if (/^src\/(simulation|core)\//.test(f)) return 'pure';
  if (/^src\/store\//.test(f)) return 'state';
  if (/^src\/(components|gates|nodes|hooks|theme|styles)\//.test(f) || /^src\/(App|main)\.tsx$/.test(f)) return 'ui';
  return 'shared';
};
for (const [f, d] of Object.entries(g)) {
  const hits = d.imports.filter((i) => i.resolved && /^src\/store\//.test(i.resolved) && !/^src\/store\//.test(f));
  if (hits.length) {
    const l = layerOf(f);
    const typeOnly = hits.every((h) => h.typeOnly);
    const k = l + (isTest(f) ? '/test' : '') + (typeOnly ? ' (type-only)' : ' (value)');
    storeImporters.byLayer[k] = (storeImporters.byLayer[k] || 0) + 1;
    storeImporters.files.push({ f, layer: l, test: isTest(f), typeOnly, targets: [...new Set(hits.map((h) => h.resolved))] });
  }
}

// ---- deep imports (bypassing an index.ts that exists) ----
const indexDirs = new Set(Object.keys(g).filter((f) => /\/index\.tsx?$/.test(f)).map((f) => path.posix.dirname(f)));
const deep = [];
for (const [f, d] of Object.entries(g)) {
  for (const i of d.imports) {
    if (!i.resolved || !g[i.resolved]) continue;
    const dir = path.posix.dirname(i.resolved);
    if (/\/index\.tsx?$/.test(i.resolved)) continue;
    if (indexDirs.has(dir) && path.posix.dirname(f) !== dir) {
      deep.push({ from: f, to: i.resolved, entry: dir + '/index.ts' });
    }
  }
}
const deepByDir = {};
for (const d of deep) deepByDir[d.entry] = (deepByDir[d.entry] || 0) + 1;

// ---- per-dir stats ----
const dirOf = (f) => { const p = f.split('/'); return p.length > 2 ? p[1] : path.posix.basename(f); };
const dirs = {};
for (const [f, d] of Object.entries(g)) {
  const k = dirOf(f);
  dirs[k] ??= { files: 0, loc: 0, testFiles: 0, testLoc: 0, prodFiles: 0, prodLoc: 0 };
  dirs[k].files++; dirs[k].loc += d.loc;
  if (isTest(f)) { dirs[k].testFiles++; dirs[k].testLoc += d.loc; } else { dirs[k].prodFiles++; dirs[k].prodLoc += d.loc; }
}

// ---- prod modules without a colocated test ----
const noTest = prod.filter((f) => {
  if (/\.d\.ts$/.test(f) || /(^|\/)(index|main|vite-env)\.(ts|tsx|d\.ts)$/.test(f)) return false;
  const base = f.replace(/\.(ts|tsx)$/, '');
  return !g[base + '.test.ts'] && !g[base + '.test.tsx'];
});
const noTestByDir = {};
for (const f of noTest) noTestByDir[dirOf(f)] = (noTestByDir[dirOf(f)] || 0) + 1;

// ---- index.ts coverage per top-level dir ----
const entryPoints = {};
for (const d of [...indexDirs].sort()) entryPoints[d] = g[d + '/index.ts']?.loc ?? g[d + '/index.tsx']?.loc;

console.log(JSON.stringify({
  counts: { all: Object.keys(g).length, prod: prod.length, test: testFiles.length },
  loc: {
    prod: { p50: pct(prodLocs, 0.5), p90: pct(prodLocs, 0.9), p99: pct(prodLocs, 0.99), max: Math.max(...prodLocs), sum: prodLocs.reduce((a, b) => a + b, 0) },
    test: { p50: pct(testLocs, 0.5), p90: pct(testLocs, 0.9), max: Math.max(...testLocs), sum: testLocs.reduce((a, b) => a + b, 0) },
    all: { p50: pct(allLocs, 0.5), p90: pct(allLocs, 0.9), max: Math.max(...allLocs), sum: allLocs.reduce((a, b) => a + b, 0) },
    over300prod: prod.filter((f) => g[f].loc > 300).length,
    over500prod: prod.filter((f) => g[f].loc > 500).length,
    over800any: Object.keys(g).filter((f) => g[f].loc > 800).length,
  },
  largest: Object.keys(g).map((f) => [f, g[f].loc]).sort((a, b) => b[1] - a[1]).slice(0, 25),
  topFanIn: top(fanIn),
  topFanOut: top(fanOut),
  storeImporters: { byLayer: storeImporters.byLayer, total: storeImporters.files.length, files: storeImporters.files },
  deepImports: { total: deep.length, byEntry: Object.entries(deepByDir).sort((a, b) => b[1] - a[1]) },
  dirs, entryPoints,
  noTest: { total: noTest.length, byDir: noTestByDir, files: noTest },
}, null, 2));
