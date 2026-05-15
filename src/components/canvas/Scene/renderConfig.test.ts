import { describe, expect, it } from 'vitest'
import { getSceneRenderConfig } from './renderConfig'

describe('getSceneRenderConfig', () => {
  it('uses full-detail canvas settings in normal mode', () => {
    expect(getSceneRenderConfig('normal')).toEqual({
      dpr: [1, 2],
      frameloop: 'always',
      gl: {
        antialias: true,
        powerPreference: 'high-performance',
      },
      shadows: true,
    })
  })

  it('caps render workload in low-power mode', () => {
    expect(getSceneRenderConfig('low-power')).toEqual({
      dpr: 1,
      frameloop: 'demand',
      gl: {
        antialias: false,
        powerPreference: 'low-power',
      },
      shadows: false,
    })
  })
})
