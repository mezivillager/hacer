import { Grid } from '@react-three/drei'
import { colors } from '@/theme'
import { GRID_SIZE } from '@/utils/grid'

/**
 * Grid component - static, never re-renders.
 * Always uses default colors regardless of interaction state.
 * Grid cell size matches the logical grid system (GRID_SIZE = 2.0).
 */
export function SceneGrid() {
  return (
    <Grid
      args={[20, 20]}
      cellSize={GRID_SIZE}
      cellThickness={1}
      cellColor={colors.grid.cell}
      sectionSize={GRID_SIZE * 2}
      sectionThickness={1.5}
      sectionColor={colors.grid.section}
      fadeDistance={30}
      fadeStrength={1}
      followCamera={false}
      infiniteGrid
    />
  )
}
