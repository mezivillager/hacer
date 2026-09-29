import type { Snapshot } from './snapshot'

/** Stub: the needs-human list is rendered in the next commit. */
export function NeedsHuman(props: { snapshot: Snapshot }) {
  return <span hidden>{props.snapshot.generatedAt}</span>
}
