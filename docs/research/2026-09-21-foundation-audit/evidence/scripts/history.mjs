#!/usr/bin/env node
// Per-merged-PR file/dir spread, co-change pairs, churn hotspots.
// Usage: node history.mjs <repo-root> <since-ISO> [--since2 <ISO> for the agent-era window]
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const root = process.argv[2];
const since = process.argv[3] || '2026-06-01';
const agentSince = process.argv[4] || '2026-09-18';

const git = (args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', maxBuffer: 1 << 28 });

// A merged PR = a merge commit on main whose subject matches "Merge pull request #N" or a squash
// commit whose subject ends with "(#N)". Squash-merge is this repo's mode, so use (#N).
function prCommits(sinceDate) {
  const raw = git(['log', 'origin/main', `--since=${sinceDate}`, '--no-merges', '--name-only',
    '--pretty=format:%x00%H%x1f%ad%x1f%s', '--date=short']);
  const out = [];
  for (const chunk of raw.split('\u0000').slice(1)) {
    const [head, ...rest] = chunk.split('\n');
    const [sha, date, subject] = head.split('\u001f');
    const files = rest.filter(Boolean);
    const m = /\(#(\d+)\)\s*$/.exec(subject || '');
    out.push({ sha, date, subject, files, pr: m ? Number(m[1]) : null });
  }
  return out;
}

const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))] : 0; };
const topDir = (f) => {
  const p = f.split('/');
  if (p[0] !== 'src') return p[0];
  return p.length > 2 ? 'src/' + p[1] : 'src';
};

function summarize(commits, label) {
  const prs = commits.filter((c) => c.pr !== null);
  const fileCounts = prs.map((c) => c.files.length);
  const srcOnly = prs.map((c) => c.files.filter((f) => f.startsWith('src/')).length);
  const dirCounts = prs.map((c) => new Set(c.files.map(topDir)).size);
  return {
    label, commits: commits.length, prCommits: prs.length,
    filesPerPR: { p50: pct(fileCounts, 0.5), p90: pct(fileCounts, 0.9), max: Math.max(0, ...fileCounts) },
    srcFilesPerPR: { p50: pct(srcOnly, 0.5), p90: pct(srcOnly, 0.9), max: Math.max(0, ...srcOnly) },
    topDirsPerPR: { p50: pct(dirCounts, 0.5), p90: pct(dirCounts, 0.9), max: Math.max(0, ...dirCounts) },
    biggest: prs.map((c) => ({ pr: c.pr, files: c.files.length, subject: c.subject.slice(0, 80) }))
      .sort((a, b) => b.files - a.files).slice(0, 10),
  };
}

// co-change: pairs of src/ files appearing in the same commit, counted across commits
function coChange(commits, minFiles = 2, maxFiles = 40) {
  const pair = new Map(), churn = new Map();
  for (const c of commits) {
    const fs_ = [...new Set(c.files.filter((f) => /^src\/.*\.(ts|tsx)$/.test(f) && !/\.test\./.test(f)))].sort();
    for (const f of fs_) churn.set(f, (churn.get(f) || 0) + 1);
    if (fs_.length < minFiles || fs_.length > maxFiles) continue;
    for (let i = 0; i < fs_.length; i++) for (let j = i + 1; j < fs_.length; j++) {
      const k = fs_[i] + ' | ' + fs_[j];
      pair.set(k, (pair.get(k) || 0) + 1);
    }
  }
  const crossDir = [...pair.entries()].filter(([k]) => { const [a, b] = k.split(' | '); return topDir(a) !== topDir(b); });
  return {
    topPairs: [...pair.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20),
    topCrossDirPairs: crossDir.sort((a, b) => b[1] - a[1]).slice(0, 20),
    churn: [...churn.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20),
  };
}

// directory co-change matrix
function dirMatrix(commits) {
  const pair = new Map();
  for (const c of commits) {
    const ds = [...new Set(c.files.filter((f) => f.startsWith('src/')).map(topDir))].sort();
    for (let i = 0; i < ds.length; i++) for (let j = i + 1; j < ds.length; j++)
      pair.set(ds[i] + ' | ' + ds[j], (pair.get(ds[i] + ' | ' + ds[j]) || 0) + 1);
  }
  return [...pair.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
}

const all = prCommits(since);
const agent = prCommits(agentSince);
console.log(JSON.stringify({
  window: { since, agentSince },
  all: summarize(all, `since ${since}`),
  agentEra: summarize(agent, `since ${agentSince}`),
  coChangeAll: coChange(all),
  coChangeAgent: coChange(agent),
  dirMatrixAll: dirMatrix(all),
  dirMatrixAgent: dirMatrix(agent),
}, null, 2));
