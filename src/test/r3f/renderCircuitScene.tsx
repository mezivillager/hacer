import ReactThreeTestRenderer from '@react-three/test-renderer'
import type { Scene } from 'three'
import { TestScene } from './TestScene'

/**
 * Whether real gate meshes render cleanly under test-renderer. Set from the
 * Task-1 spike outcome. Core routing assertions resolve pin positions from the
 * store (getPinWorldPosition), so they hold regardless of this flag; it only
 * controls the realism nicety of also rendering gate bodies.
 */
export const GATES_RENDER_UNDER_TEST = true

export interface SceneTestHandle {
  renderer: Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>
  scene: Scene
  unmount: () => Promise<void>
}

/** Render the CURRENT useCircuitStore circuit into an inspectable three.js scene. */
export async function renderCircuitScene(
  options: { gates?: boolean; wires?: boolean } = {},
): Promise<SceneTestHandle> {
  const { gates = GATES_RENDER_UNDER_TEST, wires = true } = options
  const renderer = await ReactThreeTestRenderer.create(<TestScene gates={gates} wires={wires} />)
  return {
    renderer,
    scene: renderer.scene.instance as unknown as Scene,
    unmount: () => renderer.unmount(),
  }
}
