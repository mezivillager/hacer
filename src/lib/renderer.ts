/** What fills the shell's scene slot: the R3F 3D scene, or nothing. */
export type Renderer = 'r3f' | 'none'

/**
 * The renderer chosen by `?renderer=` in a location search string. Only `none` is recognised
 * besides the default; anything else, or no param, keeps the 3D renderer.
 */
export function resolveRendererFromSearchParams(search: string): Renderer {
  return new URLSearchParams(search).get('renderer') === 'none' ? 'none' : 'r3f'
}
