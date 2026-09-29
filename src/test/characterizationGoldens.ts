import { expect } from 'vitest'

/**
 * Fails unless a characterization's golden directory holds exactly one `<case>.json` per case.
 * Without it, a golden whose case was removed is never checked again, and removing a case never
 * touches the protected golden path, so the PR is not flagged.
 *
 * `onDisk` is the caller's `import.meta.glob('./<golden dir>/**\/*')` and `dir` the same directory
 * as `./<golden dir>`: Vite needs the pattern as a literal in the calling file. The glob recurses so
 * a golden in a subdirectory shows up here, where it is an orphan (nothing reads it). Only the keys
 * are read, so no golden is loaded.
 */
export function expectOneGoldenPerCase(
  onDisk: Record<string, unknown>,
  cases: string[],
  dir: string,
): void {
  expect(Object.keys(onDisk).sort()).toEqual(cases.map((name) => `${dir}/${name}.json`).sort())
}
