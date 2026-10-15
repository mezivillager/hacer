import { describe, it, expect, vi, afterEach } from 'vitest'
import type { ComponentProps } from 'react'
import ReactThreeTestRenderer from '@react-three/test-renderer'
import { Color, type Object3D } from 'three'
import { Wire3D } from './Wire3D'
import { colors } from '@/theme'
import { isRenderedLine, readLinePoints } from '@/test/r3f/linePoints'
import type { WirePath } from '@/utils/wiringScheme/types'

vi.mock('@/store/circuitStore', () => {
  const noStore = () => {
    throw new Error('Wire3D read the store')
  }
  return {
    useCircuitStore: Object.assign(noStore, { getState: noStore }),
    circuitActions: new Proxy({}, { get: noStore }),
  }
})

type Renderer = Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>

interface LineMaterialLike {
  linewidth: number
  color: Color
  opacity: number
}

const PATH: WirePath = {
  segments: [
    { type: 'horizontal', start: { x: 0, y: 0.2, z: 0 }, end: { x: 1, y: 0.2, z: 0 } },
    {
      type: 'arc',
      start: { x: 1, y: 0.2, z: 0 },
      end: { x: 2, y: 0.2, z: 0 },
      arcCenter: { x: 1.5, y: 0.2, z: 0 },
      arcRadius: 0.5,
    },
    { type: 'horizontal', start: { x: 2, y: 0.2, z: 0 }, end: { x: 3, y: 0.2, z: 0 } },
  ],
  totalLength: 3,
}

const mounted: Renderer[] = []

async function mount(overrides: Partial<ComponentProps<typeof Wire3D>> = {}): Promise<Renderer> {
  const renderer = await ReactThreeTestRenderer.create(
    <Wire3D start={{ x: 0, y: 0.2, z: 0 }} end={{ x: 3, y: 0.2, z: 0 }} precomputedPath={PATH} performanceMode="normal" {...overrides} />,
  )
  mounted.push(renderer)
  return renderer
}

const lines = (renderer: Renderer): Object3D[] =>
  renderer.scene.findAll((node) => isRenderedLine(node.instance)).map((node) => node.instance)
const lineMaterial = (line: Object3D) => (line as Object3D & { material: LineMaterialLike }).material
const hex = (colour: string) => new Color(colour).getHexString()

afterEach(async () => {
  for (const renderer of mounted.splice(0)) await renderer.unmount()
})

describe('Wire3D under test-renderer, with no store', () => {
  it('draws one line per segment, and the hop as a 31-point arc, from props alone', async () => {
    const renderer = await mount()

    expect(lines(renderer).map((line) => readLinePoints(line).length)).toEqual([2, 31, 2])
  })

  it('draws the hop with 13 points in low-power mode', async () => {
    const renderer = await mount({ performanceMode: 'low-power' })

    expect(lines(renderer).map((line) => readLinePoints(line).length)).toEqual([2, 13, 2])
  })

  it('draws a selected wire 3 wide, or 2 wide in low-power mode, and an unselected one 1 wide', async () => {
    const selected = await mount({ isSelected: true })
    const selectedLowPower = await mount({ isSelected: true, performanceMode: 'low-power' })
    const unselected = await mount()

    expect(lines(selected).map((line) => lineMaterial(line).linewidth)).toEqual([3, 3, 3])
    expect(lines(selectedLowPower).map((line) => lineMaterial(line).linewidth)).toEqual([2, 2, 2])
    expect(lines(unselected).map((line) => lineMaterial(line).linewidth)).toEqual([1, 1, 1])
  })

  it('colours the wire by selection and signal', async () => {
    const idle = await mount()
    const active = await mount({ isActive: true })
    const selected = await mount({ isActive: true, isSelected: true })

    expect(lineMaterial(lines(idle)[0]).color.getHexString()).toBe(hex(colors.wire.default))
    expect(lineMaterial(lines(active)[0]).color.getHexString()).toBe(hex(colors.wire.active))
    expect(lineMaterial(lines(selected)[0]).color.getHexString()).toBe(hex(colors.wire.selected))
  })

  it('draws a preview wire at 0.7 opacity', async () => {
    const preview = await mount({ isPreview: true })
    const committed = await mount()

    expect(lineMaterial(lines(preview)[0]).opacity).toBe(0.7)
    expect(lineMaterial(lines(committed)[0]).opacity).toBe(1)
  })

  it('draws nothing without both endpoints or without a path', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(lines(await mount({ start: null }))).toEqual([])
    expect(lines(await mount({ end: null }))).toEqual([])
    expect(lines(await mount({ precomputedPath: undefined }))).toEqual([])
    expect(error).toHaveBeenCalledWith('[Wire3D] precomputedPath is required but not provided', expect.anything())

    error.mockRestore()
  })
})
