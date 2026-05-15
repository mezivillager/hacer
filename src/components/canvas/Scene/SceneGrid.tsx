import { Grid } from '@react-three/drei'
import { useCircuitStore } from '@/store/circuitStore'
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
  const performanceMode = useCircuitStore((s) => s.performanceMode)
  const lowPowerEnabled = performanceMode === 'low-power'

  return (
    <Grid
      args={lowPowerEnabled ? [16, 16] : [20, 20]}
      cellSize={GRID_SIZE}
      cellThickness={lowPowerEnabled ? 0.6 : 1.0}
      cellColor={cellColor}
      sectionSize={GRID_SIZE * 2}
      sectionThickness={lowPowerEnabled ? 0.8 : 1.2}
      sectionColor={sectionColor}
      fadeDistance={lowPowerEnabled ? 18 : 30}
      fadeStrength={1}
      followCamera={false}
      infiniteGrid={!lowPowerEnabled}
    />
  )
}
