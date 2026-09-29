/** What fills the shell's scene slot: the R3F 3D scene, or nothing. */
export type Renderer = 'r3f' | 'none'

export function resolveRendererFromSearchParams(_search: string): Renderer {
  throw new Error('not implemented')
}
