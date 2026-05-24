import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render } from '@testing-library/react'
import { ChipBody3D } from './ChipBody3D'
import { getBuiltinChipRegistry, resetAppRegistriesForTests } from '@/core/chips/appRegistry'
import type { GateInstance, GateType } from '@/store/types'

// R3F primitives (<group>, <mesh>, <boxGeometry>, etc.) are unknown HTML
// elements in jsdom, which is harmless. The hooks below are not unknown
// elements and must be mocked to avoid runtime errors.
vi.mock('@react-three/fiber', () => ({
  useFrame: vi.fn(),
  useThree: vi.fn(() => ({
    camera: {},
    gl: { domElement: {} },
  })),
}))

vi.mock('@react-three/drei', () => ({
  Html: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="gate-html">{children}</div>
  ),
}))

vi.mock('@/hooks/useGateDrag', () => ({
  useGateDrag: vi.fn(() => ({
    isDragging: false,
    shouldAllowClick: vi.fn(() => true),
    onPointerDown: vi.fn(),
    onPointerMove: vi.fn(),
    onPointerUp: vi.fn(),
    onPointerLeave: vi.fn(),
  })),
}))

vi.mock('@/store/circuitStore', () => {
  const mockState = {
    performanceMode: 'normal' as 'normal' | 'low-power',
    placementMode: null,
    wiringFrom: null,
    wires: [],
    gates: [],
  }
  const useCircuitStore = Object.assign(
    <T,>(selector: (state: typeof mockState) => T): T => selector(mockState),
    { getState: () => mockState },
  )
  return {
    useCircuitStore,
    circuitActions: {
      setHoveredGate: vi.fn(),
      updateWirePreviewPosition: vi.fn(),
      setDestinationPin: vi.fn(),
    },
  }
})

vi.mock('@/gates/common/WireStub', () => ({
  WireStub: ({ position }: { position: [number, number, number] }) => (
    <div data-testid={`wire-stub-${position[0]}-${position[1]}-${position[2]}`}>WireStub</div>
  ),
}))

beforeEach(() => {
  resetAppRegistriesForTests()
})

/**
 * Build a GateInstance whose pin schema mirrors the chip's declared pins.
 *
 * `GateInstance.type: GateType` is still the legacy union (T4.A migrates this
 * to `chipName: string`); ChipBody3D reads its chip name from the explicit
 * `chipName` prop, not from `gate.type`, so the cast here is purely a type
 * shim until that migration lands.
 */
function makeGate(chipName: string): GateInstance {
  const reg = getBuiltinChipRegistry()
  const chip = reg.get(chipName)
  if (!chip) throw new Error(`chip ${chipName} not registered`)
  return {
    id: `g-${chipName}`,
    type: chipName as GateType,
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: Math.PI / 2, y: 0, z: 0 },
    inputs: chip.inputs.map((p, i) => ({
      id: `g-${chipName}-in-${i}`,
      name: p.name,
      type: 'input' as const,
      value: 0,
      width: p.width,
    })),
    outputs: chip.outputs.map((p, i) => ({
      id: `g-${chipName}-out-${i}`,
      name: p.name,
      type: 'output' as const,
      value: 0,
      width: p.width,
    })),
    selected: false,
    width: 1,
  }
}

describe('ChipBody3D', () => {
  it('renders without crashing for Not', () => {
    const gate = makeGate('Not')
    expect(() =>
      render(
        <ChipBody3D
          gate={gate}
          chipName="Not"
          isWiring={false}
          isPinConnected={() => false}
          onClick={() => {}}
          onPinClick={() => {}}
          onInputToggle={() => {}}
        />,
      ),
    ).not.toThrow()
  })

  it('renders without crashing for Mux8Way16 (9 input pins)', () => {
    const gate = makeGate('Mux8Way16')
    expect(() =>
      render(
        <ChipBody3D
          gate={gate}
          chipName="Mux8Way16"
          isWiring={false}
          isPinConnected={() => false}
          onClick={() => {}}
          onPinClick={() => {}}
          onInputToggle={() => {}}
        />,
      ),
    ).not.toThrow()
  })

  it('throws a readable error for unknown chipName', () => {
    const gate = makeGate('Not')
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() =>
      render(
        <ChipBody3D
          gate={gate}
          chipName="TotallyNotARealChip"
          isWiring={false}
          isPinConnected={() => false}
          onClick={() => {}}
          onPinClick={() => {}}
          onInputToggle={() => {}}
        />,
      ),
    ).toThrow(/TotallyNotARealChip/)
    spy.mockRestore()
  })
})
