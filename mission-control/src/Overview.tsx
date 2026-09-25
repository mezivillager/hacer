import type { ReactNode } from 'react'
import type { Snapshot } from './snapshot'

export function Overview({ snapshot }: { snapshot: Snapshot }): ReactNode {
  throw new Error(`Overview of ${snapshot.generatedAt}: not implemented`)
}
