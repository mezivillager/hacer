import type { PerformanceMode } from '@/store/types'

type SceneFrameloop = 'always' | 'demand'

export type SceneRenderConfig = {
  dpr: number | [number, number]
  frameloop: SceneFrameloop
  gl: {
    antialias: boolean
    powerPreference: WebGLPowerPreference
  }
  shadows: boolean
}

export function getSceneRenderConfig(mode: PerformanceMode): SceneRenderConfig {
  if (mode === 'low-power') {
    return {
      dpr: 1,
      frameloop: 'demand',
      gl: {
        antialias: false,
        powerPreference: 'low-power',
      },
      shadows: false,
    }
  }

  return {
    dpr: [1, 2],
    frameloop: 'always',
    gl: {
      antialias: true,
      powerPreference: 'high-performance',
    },
    shadows: true,
  }
}
