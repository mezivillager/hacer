import { expect } from 'vitest'

/**
 * Fails unless a characterization's golden directory holds exactly one `<case>.json` per case.
 * Without it, a golden whose case was removed is never checked again, and removing a case never
 * touches the protected golden path, so the PR is not flagged.
 *
 * `onDisk` is the caller's `import.meta.glob('./<golden dir>/*')`: Vite needs the pattern as a
 * literal in the calling file. Only its keys are read, so no golden is loaded.
 */
export function expectOneGoldenPerCase(onDisk: Record<string, unknown>, cases: string[]): void {
  const goldens = Object.keys(onDisk).map((path) => path.slice(path.lastIndexOf('/') + 1))
  expect(goldens.sort()).toEqual(cases.map((name) => `${name}.json`).sort())
}
