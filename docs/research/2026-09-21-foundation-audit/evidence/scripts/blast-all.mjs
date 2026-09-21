#!/usr/bin/env node
// Blast radius for every issue in the imminent-work set. Usage: node blast-all.mjs <graph.json>
import fs from 'node:fs';
const g = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')).files;
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

const ISSUES = {
  186: { title: 'injected id generator + clock', seeds: ['src/store/actions/gateActions/gateActions.ts','src/store/actions/nodeActions/nodeActions.ts','src/store/actions/wireActions/wireActions.ts','src/store/actions/busActions/busActions.ts','src/store/actions/signalActions/signalActions.ts','src/store/actions/junctionPlacementActions/junctionPlacementActions.ts','src/store/actions/nodePlacementActions/nodePlacementActions.ts','src/store/actions/statusActions/statusActions.ts','src/store/circuitStore.ts','src/core/serialization/serialize.ts'] },
  188: { title: 'document/layout sidecar, per-surface state', seeds: ['src/store/types.ts'] },
  189: { title: 'command registry + patches, undo/redo', seeds: ['src/store/actions/','src/store/circuitStore.ts'] },
  190: { title: 'one engine: canvas -> compileHDL', seeds: ['src/simulation/topologicalEval.ts','src/core/chips/evaluateChip.ts','src/core/hdl/compiler.ts','src/core/chips/types.ts'] },
  181: { title: 'deserialize returns warnings as data', seeds: ['src/core/serialization/deserialize.ts'] },
  185: { title: 'store drops e2e types + renderTracking', seeds: ['src/store/circuitStore.ts'] },
  175: { title: 'splitter/joiner (verify-only)', seeds: ['src/store/actions/busActions/','src/store/actions/busPlacementActions/','src/nodes/BusSplitter3D.tsx','src/nodes/BusJoiner3D.tsx'] },
  210: { title: 'netlist -> ELK positions (pure fn)', seeds: ['src/utils/wiringScheme/'] },
  315: { title: 'renderer selector', seeds: ['src/App.tsx','src/components/Shell.tsx','src/components/canvas/CanvasArea.tsx'] },
  217: { title: '__SCENE_HELPERS__.describe()', seeds: ['src/components/canvas/Scene/SceneReadyBridge.tsx'] },
};

const out = [];
for (const [n, { title, seeds }] of Object.entries(ISSUES)) {
  const start = Object.keys(g).filter((f) => seeds.some((s) => f === s || f.startsWith(s)));
  const d1 = new Set(); for (const s of start) for (const r of rev.get(s) || []) if (!start.includes(r)) d1.add(r);
  const seen = new Set(start); const q = [...start];
  while (q.length) { const x = q.shift(); for (const r of rev.get(x) || []) if (!seen.has(r)) { seen.add(r); q.push(r); } }
  const closure = [...seen].filter((f) => !start.includes(f));
  const by = (arr) => arr.reduce((a, f) => { const k = layerOf(f) + (isTest(f) ? '/test' : ''); a[k] = (a[k] || 0) + 1; return a; }, {});
  out.push({ issue: +n, title, seedFiles: start.length, seedProd: start.filter(f=>!isTest(f)).length,
    seedLoc: start.reduce((a, f) => a + g[f].loc, 0),
    direct: d1.size, directByLayer: by([...d1]), directProd: [...d1].filter(f=>!isTest(f)).length,
    transitive: closure.length, transitiveByLayer: by(closure), transitiveProd: closure.filter(f=>!isTest(f)).length,
    directList: [...d1].sort(), seedList: start });
}
console.log(JSON.stringify(out, null, 2));
