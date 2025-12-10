export type GatePlacement = { label: string; position: { x: number; y: number; z: number }; rotate?: { direction: 'left' | 'right'; times: number } }
export type WirePlan = { fromGate: number; fromPin: 'out-0'; toGate: number; toPin: 'in-0' | 'in-1' }
export type TogglePlan = { gate: number; pin: 'in-0' | 'in-1'; value: boolean }

export interface NandScenario {
  name: string
  placements: GatePlacement[]
  wires: WirePlan[]
  toggles: TogglePlan[]
  expectations: {
    gates: number
    wires: number
    outputs: {
      gate1: boolean
      gate2: boolean
      gate3: boolean
      gate3Inputs: [boolean, boolean]
    }
  }
}

export const nand3Scenario: NandScenario = {
  name: 'three-gate nand circuit',
  placements: [
    { label: 'g1', position: { x: -2, y: 0.4, z: 0 }, rotate: { direction: 'left', times: 2 } },
    { label: 'g2', position: { x: -2, y: 0.4, z: 2 }, rotate: { direction: 'left', times: 2 } },
    { label: 'g3', position: { x: 2, y: 0.4, z: 1 }, rotate: { direction: 'left', times: 2 } },
  ],
  wires: [
    { fromGate: 0, fromPin: 'out-0', toGate: 2, toPin: 'in-0' },
    { fromGate: 1, fromPin: 'out-0', toGate: 2, toPin: 'in-1' },
  ],
  toggles: [
    { gate: 0, pin: 'in-0', value: true },
    { gate: 0, pin: 'in-1', value: true },
    { gate: 1, pin: 'in-0', value: true },
  ],
  expectations: {
    gates: 3,
    wires: 2,
    outputs: {
      gate1: false,
      gate2: true,
      gate3: true,
      gate3Inputs: [false, true],
    },
  },
}
