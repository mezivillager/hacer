#!/usr/bin/env node
// Extract .hdl/.tst/.cmp text from a web-ide checkout that sync-vectors.sh has already
// pinned. The checkout is data: each project's index.ts is read as text for the files it
// ships, and this process imports the upstream string modules those files come from and
// writes their template text. It does not run web-ide. Every file is read before any is
// written, so a refusal leaves the tree as it was.
//
//   node --experimental-strip-types scripts/sync-vectors.mjs <web-ide-root> <vectors-root>

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { VENDORED_PROJECTS, exportText, licenseNotice, shippedFiles } from './sync-vectors.logic.mjs'

const [webIdeRoot, vectorsRoot] = process.argv.slice(2)
if (!webIdeRoot || !vectorsRoot) {
  console.error('usage: node --experimental-strip-types scripts/sync-vectors.mjs <web-ide-root> <vectors-root>')
  process.exit(2)
}

const writes = []
for (const project of VENDORED_PROJECTS) {
  const sourceDir = path.join(webIdeRoot, 'projects', 'src', `project_${project}`)
  const entries = shippedFiles(readFileSync(path.join(sourceDir, 'index.ts'), 'utf8'))
  if (entries.length === 0) throw new Error(`${sourceDir}/index.ts ships no files`)
  for (const entry of entries) {
    const mod = await import(pathToFileURL(path.join(sourceDir, entry.module)).href)
    writes.push({ file: path.join(vectorsRoot, project, entry.file), text: exportText(mod, entry) })
  }
}

for (const { file, text } of writes) {
  mkdirSync(path.dirname(file), { recursive: true })
  writeFileSync(file, text)
}
mkdirSync(vectorsRoot, { recursive: true })
writeFileSync(path.join(vectorsRoot, 'LICENSE'), licenseNotice())
