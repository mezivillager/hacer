#!/usr/bin/env node
// Per-merged-PR spread + co-change, from `gh pr list --state merged --json number,title,mergedAt,files,...`
// Usage: node pr-spread.mjs <prs.json> [sinceA=2026-06-01] [sinceB=2026-09-18]
// NOTE: main is rebase-merged (linear, no merge commits, no "(#N)" subjects), so PR boundaries must
// come from the GitHub API, not from git log. Verified: 0 merge commits on origin/main since 2026-09-18.
import fs from 'node:fs';
const prs = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const A = process.argv[3] || '2026-06-01';
const B = process.argv[4] || '2026-09-18';

const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))] : 0; };
const topDir = (f) => { const p = f.split('/'); if (p[0] !== 'src') return p[0] + (p.length > 1 ? '/' : ''); return p.length > 2 ? 'src/' + p[1] : 'src'; };
const isSrc = (f) => f.startsWith('src/');
const isProdSrc = (f) => isSrc(f) && /\.(ts|tsx)$/.test(f) && !/\.test\./.test(f);

function summarize(set, label) {
  const files = set.map((p) => p.files.map((f) => f.path));
  const n = files.map((f) => f.length);
  const src = files.map((f) => f.filter(isSrc).length);
  const dirs = files.map((f) => new Set(f.map(topDir)).size);
  const srcDirs = files.map((f) => new Set(f.filter(isSrc).map(topDir)).size);
  const lines = set.map((p) => p.additions + p.deletions);
  const srcTouching = set.filter((p) => p.files.some((f) => isSrc(f.path)));
  const srcOnlyN = srcTouching.map((p) => p.files.filter((f) => isSrc(f.path)).length);
  const srcOnlyDirs = srcTouching.map((p) => new Set(p.files.filter((f) => isSrc(f.path)).map((f) => topDir(f.path))).size);
  return {
    label, prs: set.length, srcTouchingPRs: srcTouching.length,
    filesPerPR: { p50: pct(n, 0.5), p90: pct(n, 0.9), max: Math.max(0, ...n) },
    srcFilesPerPR_allPRs: { p50: pct(src, 0.5), p90: pct(src, 0.9), max: Math.max(0, ...src) },
    srcFilesPerPR_srcTouchingOnly: { p50: pct(srcOnlyN, 0.5), p90: pct(srcOnlyN, 0.9), max: Math.max(0, ...srcOnlyN) },
    topDirsPerPR: { p50: pct(dirs, 0.5), p90: pct(dirs, 0.9), max: Math.max(0, ...dirs) },
    srcTopDirsPerPR_srcTouchingOnly: { p50: pct(srcOnlyDirs, 0.5), p90: pct(srcOnlyDirs, 0.9), max: Math.max(0, ...srcOnlyDirs) },
    linesPerPR: { p50: pct(lines, 0.5), p90: pct(lines, 0.9), max: Math.max(0, ...lines) },
    over400lines: lines.filter((l) => l > 400).length,
    widest: set.map((p) => ({ pr: p.number, files: p.files.length, src: p.files.filter((f) => isSrc(f.path)).length,
      dirs: [...new Set(p.files.filter((f) => isSrc(f.path)).map((f) => topDir(f.path)))].sort(),
      lines: p.additions + p.deletions, title: p.title.slice(0, 78) }))
      .sort((a, b) => b.dirs.length - a.dirs.length || b.src - a.src).slice(0, 12),
  };
}

function cochange(set) {
  const pair = new Map(), dirPair = new Map(), churn = new Map();
  for (const p of set) {
    const f = [...new Set(p.files.map((x) => x.path).filter(isProdSrc))].sort();
    for (const x of f) churn.set(x, (churn.get(x) || 0) + 1);
    if (f.length >= 2 && f.length <= 30) {
      for (let i = 0; i < f.length; i++) for (let j = i + 1; j < f.length; j++)
        pair.set(f[i] + ' | ' + f[j], (pair.get(f[i] + ' | ' + f[j]) || 0) + 1);
    }
    const d = [...new Set(p.files.map((x) => x.path).filter(isSrc).map(topDir))].sort();
    for (let i = 0; i < d.length; i++) for (let j = i + 1; j < d.length; j++)
      dirPair.set(d[i] + ' | ' + d[j], (dirPair.get(d[i] + ' | ' + d[j]) || 0) + 1);
  }
  const cross = [...pair.entries()].filter(([k]) => { const [a, b] = k.split(' | '); return topDir(a) !== topDir(b); });
  return {
    topPairs: [...pair.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15),
    topCrossDirPairs: cross.sort((a, b) => b[1] - a[1]).slice(0, 15),
    topDirPairs: [...dirPair.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15),
    churn: [...churn.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20),
  };
}

const a = prs.filter((p) => p.mergedAt >= A), b = prs.filter((p) => p.mergedAt >= B);
console.log(JSON.stringify({
  since: { A, B },
  A: summarize(a, `merged since ${A}`), B: summarize(b, `merged since ${B} (agent era)`),
  coA: cochange(a), coB: cochange(b),
  docOnlyB: b.filter((p) => !p.files.some((f) => isSrc(f.path))).length,
}, null, 2));
