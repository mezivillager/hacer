#!/usr/bin/env node
// Guard: no helper under `e2e/` dies unnoticed (#332). Part of `pnpm run lint`.
//
//   pnpm run lint:e2e-exports
//
// Parses every tracked `.ts`/`.tsx` file with the TypeScript AST, resolves each import to a repo
// path, and reports any export in a non-spec `e2e/` file that no other module imports and its own
// file no longer references. Exits 1 with the list. Verdict and scope: e2e-dead-exports.logic.mjs.

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import { EXIT, findDeadExports, formatReport } from './e2e-dead-exports.logic.mjs'

const root = path.resolve(import.meta.dirname, '..')
const files = execFileSync('git', ['ls-files', '*.ts', '*.tsx'], { cwd: root, encoding: 'utf8' })
  .split('\n')
  .filter(Boolean)

/** A module specifier as a repo-relative path, or null when it leaves the repo (a package). */
function resolve(from, specifier) {
  let base
  if (specifier.startsWith('@/')) base = path.posix.join('src', specifier.slice(2))
  else if (specifier.startsWith('.')) base = path.posix.join(path.posix.dirname(from), specifier)
  else return null
  const candidates = ['.ts', '.tsx', '/index.ts', '/index.tsx'].map((suffix) => base + suffix)
  return candidates.find((candidate) => existsSync(path.join(root, candidate))) ?? null
}

/** Is this identifier a reference, or only the `name` half of `a.b` / `{ b: … }`? */
function isReference(node) {
  const parent = node.parent
  if (!parent) return true
  if (ts.isPropertyAccessExpression(parent) && parent.name === node) return false
  if (ts.isQualifiedName(parent) && parent.right === node) return false
  if (ts.isImportSpecifier(parent) || ts.isExportSpecifier(parent)) return false
  const named = ts.isPropertyAssignment(parent) || ts.isPropertySignature(parent) || ts.isMethodSignature(parent)
  return !(named && parent.name === node)
}

const EXPORTED = (node) => node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)

function parse(file) {
  const source = ts.createSourceFile(file, readFileSync(path.join(root, file), 'utf8'), ts.ScriptTarget.Latest, true)
  const module = {
    file,
    exports: [],
    imports: [],
    reexports: [],
    starReexports: [],
    namespaceImports: [],
    internalRefs: [],
  }
  const declared = new Set()

  for (const statement of source.statements) {
    if (ts.isFunctionDeclaration(statement) && EXPORTED(statement) && statement.name) {
      module.exports.push({ name: statement.name.text, kind: 'function' })
    } else if (ts.isClassDeclaration(statement) && EXPORTED(statement) && statement.name) {
      module.exports.push({ name: statement.name.text, kind: 'class' })
    } else if (ts.isInterfaceDeclaration(statement) && EXPORTED(statement)) {
      module.exports.push({ name: statement.name.text, kind: 'interface' })
    } else if (ts.isTypeAliasDeclaration(statement) && EXPORTED(statement)) {
      module.exports.push({ name: statement.name.text, kind: 'type' })
    } else if (ts.isEnumDeclaration(statement) && EXPORTED(statement)) {
      module.exports.push({ name: statement.name.text, kind: 'enum' })
    } else if (ts.isVariableStatement(statement) && EXPORTED(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) module.exports.push({ name: declaration.name.text, kind: 'const' })
      }
    } else if (ts.isImportDeclaration(statement) && statement.importClause) {
      const from = resolve(file, statement.moduleSpecifier.text)
      const bindings = statement.importClause.namedBindings
      if (statement.importClause.name) module.imports.push({ from, name: 'default' })
      if (bindings && ts.isNamespaceImport(bindings)) module.namespaceImports.push(from)
      else if (bindings) {
        for (const element of bindings.elements) {
          module.imports.push({ from, name: (element.propertyName ?? element.name).text })
        }
      }
    } else if (ts.isExportDeclaration(statement)) {
      const from = statement.moduleSpecifier ? resolve(file, statement.moduleSpecifier.text) : file
      if (!statement.exportClause) module.starReexports.push(from)
      else if (ts.isNamedExports(statement.exportClause)) {
        for (const element of statement.exportClause.elements) {
          module.reexports.push({ from, name: (element.propertyName ?? element.name).text, as: element.name.text })
        }
      }
    }
  }

  for (const exported of module.exports) declared.add(exported.name)
  const walk = (node) => {
    if (ts.isIdentifier(node) && declared.has(node.text) && isReference(node)) module.internalRefs.push(node.text)
    node.forEachChild(walk)
  }
  source.forEachChild(walk)
  // Every export names itself once where it is declared; that is not a reference to it.
  for (const exported of module.exports) {
    const at = module.internalRefs.indexOf(exported.name)
    if (at !== -1) module.internalRefs.splice(at, 1)
  }

  return module
}

let dead
try {
  dead = findDeadExports(files.map(parse))
} catch (error) {
  console.error(`e2e-dead-exports: ${error?.message ?? error}`)
  process.exit(EXIT.usage)
}

console.log(formatReport(dead))
if (dead.length > 0) {
  console.error(
    '\n  Nothing imports these, and their own file no longer uses them. Delete them, or give\n' +
      '  them a caller — a helper with neither rots unnoticed (#317, #332).',
  )
}
process.exit(dead.length > 0 ? EXIT.dead : EXIT.ok)
