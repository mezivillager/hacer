// A prop-only mesh component: violates `mesh-no-state` with a type-only import of the store.
import type { state } from '../store/state'

export type BusSplitter3DProps = { read: typeof state }
