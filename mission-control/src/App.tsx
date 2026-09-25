import type { ReactNode } from 'react'
import type { Snapshot } from './snapshot'

export function App({ load }: { load?: () => Promise<Snapshot> }): ReactNode {
  throw new Error(`App (${typeof load}): not implemented`)
}
