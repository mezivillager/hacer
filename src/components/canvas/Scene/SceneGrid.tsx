import { Grid } from '@react-three/drei'
import { useThemeColor } from '../hooks/useThemeColor'
import { GRID_SIZE } from '@/utils/grid'

/**
 * Grid component. Cell + section colors read from --canvas-grid (a single
 * uniform value per Phase 0.25 design choice) so the grid flips with the
 * active theme.
 */
export function SceneGrid() {
  const gridColor = useThemeColor('--canvas-grid')
  return (
    <Grid
      args={[20, 20]}
      cellSize={GRID_SIZE}
      cellThickness={1}
      cellColor={gridColor}
      sectionSize={GRID_SIZE * 2}
      sectionThickness={1.5}
      sectionColor={gridColor}
      fadeDistance={30}
      fadeStrength={1}
      followCamera={false}
      infiniteGrid
    />
  )
}
