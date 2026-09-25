import type { ReactNode } from 'react'
import type { Snapshot } from './snapshot'

export function Timeline({ snapshot }: { snapshot: Snapshot }): ReactNode {
  throw new Error(`Timeline of ${snapshot.generatedAt}: not implemented`)
}
