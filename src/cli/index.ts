#!/usr/bin/env node
// The `hacer` bin. Only Node I/O lives here; everything it prints and decides is ./runCli.
import { readFileSync } from 'node:fs'
import { runCli } from './runCli'

const outcome = runCli(process.argv.slice(2), (path) => readFileSync(path, 'utf8'))
process.stdout.write(outcome.stdout)
process.stderr.write(outcome.stderr)
process.exitCode = outcome.exitCode
