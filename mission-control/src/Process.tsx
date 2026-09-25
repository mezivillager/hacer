import type { ReactNode } from 'react'
import type { Snapshot } from './snapshot'

export function Process({ snapshot }: { snapshot: Snapshot }): ReactNode {
  throw new Error(`Process of ${snapshot.generatedAt}: not implemented`)
}
