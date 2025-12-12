import { Grid } from '@react-three/drei'
import { colors } from '@/theme'

/**
 * Grid component - static, never re-renders.
 * Always uses default colors regardless of interaction state.
 */
export function SceneGrid() {
  return (
    <Grid
      args={[20, 20]}
      cellSize={0.5}
      cellThickness={0.5}
      cellColor={colors.grid.cell}
      sectionSize={2}
      sectionThickness={1}
      sectionColor={colors.grid.section}
      fadeDistance={30}
      fadeStrength={1}
      followCamera={false}
      infiniteGrid
    />
  )
}
