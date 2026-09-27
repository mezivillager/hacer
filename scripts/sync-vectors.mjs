#!/usr/bin/env node
// Extract .hdl/.tst/.cmp/.asm/.hack text from a web-ide checkout that sync-vectors.sh has
// already pinned. The checkout is data: each project's index.ts is read as text for the files
// it ships, less the ones EXCLUDED leaves out, and this process imports the upstream string
// modules those files come from and writes their template text. It does not run web-ide. Every
// vendored project directory is checked for files the sync does not vendor there, and one
// refusal names them all, after each index.ts is read but before any module is imported or any
// file is written, so a refusal leaves the tree as it was. It never deletes a vector.
//
//   node --experimental-strip-types scripts/sync-vectors.mjs <web-ide-root> <vectors-root>

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  VENDORED_PROJECTS,
  exportText,
  licenseNotice,
  refuseUnshipped,
  shippedFiles,
  vendoredEntries,
} from './sync-vectors.logic.mjs'

const [webIdeRoot, vectorsRoot] = process.argv.slice(2)
if (!webIdeRoot || !vectorsRoot) {
  console.error('usage: node --experimental-strip-types scripts/sync-vectors.mjs <web-ide-root> <vectors-root>')
  process.exit(2)
}

const projects = VENDORED_PROJECTS.map((project) => {
  const sourceDir = path.join(webIdeRoot, 'projects', 'src', `project_${project}`)
  const entries = vendoredEntries(project, shippedFiles(readFileSync(path.join(sourceDir, 'index.ts'), 'utf8')))
  if (entries.length === 0) throw new Error(`${sourceDir}/index.ts ships no files`)
  return { project, sourceDir, targetDir: path.join(vectorsRoot, project), entries }
})
refuseUnshipped(
  projects.map(({ project, targetDir, entries }) => ({
    project,
    onDisk: existsSync(targetDir) ? readdirSync(targetDir) : [],
    shipped: entries.map((entry) => entry.file),
  })),
)

const writes = []
for (const { sourceDir, targetDir, entries } of projects) {
  for (const entry of entries) {
    const mod = await import(pathToFileURL(path.join(sourceDir, entry.module)).href)
    writes.push({ file: path.join(targetDir, entry.file), text: exportText(mod, entry) })
  }
}

for (const { file, text } of writes) {
  mkdirSync(path.dirname(file), { recursive: true })
  writeFileSync(file, text)
}
mkdirSync(vectorsRoot, { recursive: true })
writeFileSync(path.join(vectorsRoot, 'LICENSE'), licenseNotice())
