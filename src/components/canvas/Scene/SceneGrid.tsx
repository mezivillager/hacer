import { Grid } from '@react-three/drei'
import { useThemeColor } from '../hooks/useThemeColor'
import { GRID_SIZE } from '@/utils/grid'

/**
 * Grid component. Cell lines read --canvas-grid; section lines (major
 * intervals) read --canvas-grid-section which is more prominent, giving
 * clear visual hierarchy between minor and major grid lines.
 * Both tokens flip with the active theme.
 */
export function SceneGrid() {
  const cellColor = useThemeColor('--canvas-grid')
  const sectionColor = useThemeColor('--canvas-grid-section')
  return (
    <Grid
      args={[20, 20]}
      cellSize={GRID_SIZE}
      cellThickness={1.0}
      cellColor={cellColor}
      sectionSize={GRID_SIZE * 2}
      sectionThickness={1.2}
      sectionColor={sectionColor}
      fadeDistance={30}
      fadeStrength={1}
      followCamera={false}
      infiniteGrid
    />
  )
}
