#!/usr/bin/env node
// Layer-violation + cycle report from graph.json produced by import-graph.mjs.
// Usage: node layers.mjs <graph.json> <repo-root>
import fs from 'node:fs';
import path from 'node:path';

const g = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')).files;
const root = process.argv[3];

const PURE = ['src/simulation/', 'src/core/'];
const STATE = ['src/store/'];
const UI = ['src/components/', 'src/gates/', 'src/nodes/', 'src/hooks/', 'src/theme/', 'src/styles/', 'src/App.tsx', 'src/main.tsx'];
const SHARED = ['src/lib/', 'src/utils/', 'src/test/'];

const layerOf = (f) => {
  if (PURE.some((p) => f.startsWith(p))) return 'pure';
  if (STATE.some((p) => f.startsWith(p))) return 'state';
  if (UI.some((p) => f.startsWith(p) || f === p)) return 'ui';
  if (SHARED.some((p) => f.startsWith(p))) return 'shared';
  return 'other';
};

const isTest = (f) => /\.test\.(ts|tsx)$/.test(f) || f.startsWith('src/test/');

// ---------- 1. cross-layer import edges ----------
const REACT_EXT = /^(react|react-dom|react\/|@react-three|three|zustand|@radix-ui|framer-motion|lucide-react|sonner|next-themes|@testing-library|leva|@react-spring)/;
const rows = [];
for (const [f, d] of Object.entries(g)) {
  const lf = layerOf(f);
  for (const i of d.imports) {
    if (i.external) {
      if (lf === 'pure' && REACT_EXT.test(i.spec)) {
        rows.push({ kind: 'pure→react-ext', from: f, to: i.spec, line: i.line, typeOnly: i.typeOnly, test: isTest(f), stmt: i.stmt });
      }
      if (lf === 'state' && REACT_EXT.test(i.spec) && !/^zustand|^immer/.test(i.spec)) {
        rows.push({ kind: 'state→react-ext', from: f, to: i.spec, line: i.line, typeOnly: i.typeOnly, test: isTest(f), stmt: i.stmt });
      }
      continue;
    }
    if (!i.resolved) {
      rows.push({ kind: 'unresolved', from: f, to: i.spec, line: i.line, typeOnly: i.typeOnly, test: isTest(f), stmt: i.stmt });
      continue;
    }
    const lt = layerOf(i.resolved);
    let kind = null;
    if (lf === 'pure' && lt === 'state') kind = 'pure→state';
    else if (lf === 'pure' && lt === 'ui') kind = 'pure→ui';
    else if (lf === 'state' && lt === 'ui') kind = 'state→ui';
    if (kind) rows.push({ kind, from: f, to: i.resolved, line: i.line, typeOnly: i.typeOnly, test: isTest(f), stmt: i.stmt });
  }
}

// ---------- 2. non-src reaches (e2e/, scripts/) from src ----------
const outsideRows = [];
for (const [f, d] of Object.entries(g)) {
  for (const i of d.imports) {
    if (/(^|\/)e2e\//.test(i.spec) || i.spec.includes('../../e2e') || /^@e2e/.test(i.spec)) {
      outsideRows.push({ from: f, spec: i.spec, line: i.line, typeOnly: i.typeOnly, layer: layerOf(f) });
    }
  }
}

// ---------- 3. cycles (value edges only, and all edges) ----------
function cycles(includeTypeOnly, includeTests) {
  const adj = new Map();
  for (const [f, d] of Object.entries(g)) {
    if (!includeTests && isTest(f)) continue;
    const outs = d.imports
      .filter((i) => i.resolved && (includeTypeOnly || !i.typeOnly))
      .map((i) => i.resolved)
      .filter((r) => g[r] && (includeTests || !isTest(r)));
    adj.set(f, [...new Set(outs)]);
  }
  // Tarjan SCC
  let index = 0; const idx = new Map(), low = new Map(), onStack = new Set(), stack = [], sccs = [];
  const nodes = [...adj.keys()];
  function strong(v) {
    const work = [[v, 0]];
    idx.set(v, index); low.set(v, index); index++; stack.push(v); onStack.add(v);
    while (work.length) {
      const top = work[work.length - 1];
      const [node, pi] = top;
      const ws = adj.get(node) || [];
      if (pi < ws.length) {
        top[1]++;
        const w = ws[pi];
        if (!adj.has(w)) continue;
        if (!idx.has(w)) { idx.set(w, index); low.set(w, index); index++; stack.push(w); onStack.add(w); work.push([w, 0]); }
        else if (onStack.has(w)) low.set(node, Math.min(low.get(node), idx.get(w)));
      } else {
        work.pop();
        if (work.length) { const p = work[work.length - 1][0]; low.set(p, Math.min(low.get(p), low.get(node))); }
        if (low.get(node) === idx.get(node)) {
          const comp = []; let w;
          do { w = stack.pop(); onStack.delete(w); comp.push(w); } while (w !== node);
          if (comp.length > 1) sccs.push(comp);
        }
      }
    }
  }
  for (const n of nodes) if (!idx.has(n)) strong(n);
  // self-loops
  for (const [n, ws] of adj) if (ws.includes(n)) sccs.push([n]);
  return sccs;
}

const out = {
  layerViolations: rows,
  outsideReaches: outsideRows,
  cyclesValueOnly: cycles(false, false),
  cyclesAllEdges: cycles(true, false),
  cyclesWithTests: cycles(true, true),
  layerCounts: Object.keys(g).reduce((a, f) => { a[layerOf(f)] = (a[layerOf(f)] || 0) + 1; return a; }, {}),
};
process.stdout.write(JSON.stringify(out, null, 2));
