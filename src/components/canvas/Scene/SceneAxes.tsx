import { Line, Text } from '@react-three/drei'
import { GRID_SIZE } from '@/utils/grid'

const AXIS_COLORS = {
  x: '#ff0000', // Red
  z: '#0000ff', // Blue
} as const

/**
 * SceneAxes - Displays X and Z axis indicators with labels
 * Helps with spatial orientation during development
 * Axes are 1 grid cell long (GRID_SIZE)
 */
export function SceneAxes() {
  return (
    <>
      {/* X-axis (Red) */}
      <Line
        points={[
          [0, 0, 0],
          [GRID_SIZE, 0, 0],
        ]}
        color={AXIS_COLORS.x}
        lineWidth={2}
      />
      <Text
        position={[GRID_SIZE + 0.5, 0, 0]}
        fontSize={0.5}
        color={AXIS_COLORS.x}
        anchorX="center"
        anchorY="middle"
      >
        X
      </Text>

      {/* Z-axis (Blue) */}
      <Line
        points={[
          [0, 0, 0],
          [0, 0, GRID_SIZE],
        ]}
        color={AXIS_COLORS.z}
        lineWidth={2}
      />
      <Text
        position={[0, 0, GRID_SIZE + 0.5]}
        fontSize={0.5}
        color={AXIS_COLORS.z}
        anchorX="center"
        anchorY="middle"
      >
        Z
      </Text>
    </>
  )
}

