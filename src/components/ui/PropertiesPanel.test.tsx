import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PropertiesPanel } from './PropertiesPanel'
import { useCircuitStore } from '@/store/circuitStore'

const actualSetState = useCircuitStore.setState
const actualGetState = useCircuitStore.getState

describe('PropertiesPanel', () => {
  beforeEach(() => {
    actualSetState({
      gates: [],
      wires: [],
      selectedGateId: null,
      selectedWireId: null,
      selectedNodeId: null,
      selectedNodeType: null,
      inputNodes: [],
      outputNodes: [],
      junctions: [],
    })
  })

  it('renders nothing when no element is selected', () => {
    const { container } = render(<PropertiesPanel />)
    expect(container.firstChild).toBeNull()
  })

  it('renders panel when a gate is selected', () => {
    const gate = {
      id: 'gate-1',
      type: 'NAND' as const,
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      pins: [],
    }

    actualSetState({
      gates: [gate],
      selectedGateId: 'gate-1',
    })

    render(<PropertiesPanel />)
    expect(screen.getByText('NAND')).toBeInTheDocument()
    expect(screen.getByText('gate-1')).toBeInTheDocument()
  })

  it('renders panel when an input node is selected', () => {
    const inputNode = {
      id: 'in-1',
      name: 'a',
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      value: 0,
      width: 1,
    }

    actualSetState({
      inputNodes: [inputNode],
      selectedNodeId: 'in-1',
      selectedNodeType: 'input',
    })

    render(<PropertiesPanel />)
    expect(screen.getByText('INPUT')).toBeInTheDocument()
    expect(screen.getByText('a')).toBeInTheDocument()
  })

  it('renders panel when an output node is selected', () => {
    const outputNode = {
      id: 'out-1',
      name: 'out',
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      value: 0,
      width: 1,
    }

    actualSetState({
      outputNodes: [outputNode],
      selectedNodeId: 'out-1',
      selectedNodeType: 'output',
    })

    render(<PropertiesPanel />)
    expect(screen.getByText('OUTPUT')).toBeInTheDocument()
    expect(screen.getByText('out')).toBeInTheDocument()
  })

  it('renders panel when a wire is selected', () => {
    const wire = {
      id: 'wire-1',
      from: { type: 'input' as const, entityId: 'in-1' },
      to: { type: 'gate' as const, entityId: 'gate-1', pinId: 'pin-a' },
      segments: [],
      crossesWireIds: [],
    }

    actualSetState({
      wires: [wire],
      selectedWireId: 'wire-1',
    })

    render(<PropertiesPanel />)
    expect(screen.getByText('WIRE')).toBeInTheDocument()
    expect(screen.getByText('wire-1')).toBeInTheDocument()
  })

  it('shows default value toggle for input nodes', () => {
    const inputNode = {
      id: 'in-1',
      name: 'a',
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      value: 0,
      width: 1,
    }

    actualSetState({
      inputNodes: [inputNode],
      selectedNodeId: 'in-1',
      selectedNodeType: 'input',
    })

    render(<PropertiesPanel />)
    expect(screen.getByText('Default Value')).toBeInTheDocument()
    expect(screen.getByText('Initial state when simulation starts')).toBeInTheDocument()
  })

  it('shows rotation control for gates', () => {
    const gate = {
      id: 'gate-1',
      type: 'AND' as const,
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      pins: [],
    }

    actualSetState({
      gates: [gate],
      selectedGateId: 'gate-1',
    })

    render(<PropertiesPanel />)
    expect(screen.getByText('Rotation')).toBeInTheDocument()
    expect(screen.getByText('+90')).toBeInTheDocument()
  })

  it('shows position information for selected elements', () => {
    const gate = {
      id: 'gate-1',
      type: 'OR' as const,
      position: { x: 5.5, y: 0, z: 3.2 },
      rotation: { x: 0, y: 0, z: 0 },
      pins: [],
    }

    actualSetState({
      gates: [gate],
      selectedGateId: 'gate-1',
    })

    render(<PropertiesPanel />)
    expect(screen.getByText('Position')).toBeInTheDocument()
    expect(screen.getByText('5.5')).toBeInTheDocument()
    expect(screen.getByText('3.2')).toBeInTheDocument()
  })
})
