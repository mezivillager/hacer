#!/usr/bin/env node
// CI peer-range check (#455). Red stub — exits 1 so a green run cannot be an empty process.

import path from 'node:path'
import { fileURLToPath } from 'node:url'

export function readInstalledSet() {
  throw new Error('not implemented')
}

const isMain = process.argv[1] !== undefined
  && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])

if (isMain) {
  console.error('not implemented')
  process.exit(1)
}
