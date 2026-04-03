import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PropertiesPanel } from './PropertiesPanel'
import { useCircuitStore } from '@/store/circuitStore'
import type { GateInstance, Wire, InputNode, OutputNode } from '@/store/types'

const setState = useCircuitStore.setState
const getState = useCircuitStore.getState

const makeGate = (overrides: Partial<GateInstance> = {}): GateInstance => ({
  id: 'gate-001',
  type: 'NAND',
  position: { x: 1, y: 2, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  inputs: [
    { id: 'in0', name: 'in0', type: 'input', value: 0 },
    { id: 'in1', name: 'in1', type: 'input', value: 0 },
  ],
  outputs: [{ id: 'out0', name: 'out0', type: 'output', value: 0 }],
  selected: true,
  ...overrides,
})

const makeWire = (overrides: Partial<Wire> = {}): Wire => ({
  id: 'wire-001',
  from: { type: 'gate', entityId: 'gate-001', pinId: 'out0' },
  to: { type: 'gate', entityId: 'gate-002', pinId: 'in0' },
  segments: [],
  crossesWireIds: [],
  ...overrides,
})

const makeInputNode = (overrides: Partial<InputNode> = {}): InputNode => ({
  id: 'input-001',
  name: 'A',
  position: { x: -2, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  value: 0,
  width: 1,
  ...overrides,
})

const makeOutputNode = (overrides: Partial<OutputNode> = {}): OutputNode => ({
  id: 'output-001',
  name: 'OUT',
  position: { x: 5, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  value: 0,
  width: 1,
  ...overrides,
})

describe('PropertiesPanel', () => {
  beforeEach(() => {
    setState({
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

  it('renders nothing when nothing is selected', () => {
    render(<PropertiesPanel />)
    expect(screen.queryByTestId('properties-panel')).not.toBeInTheDocument()
  })

  it('renders when a gate is selected', () => {
    const gate = makeGate()
    setState({ gates: [gate], selectedGateId: gate.id })
    render(<PropertiesPanel />)

    expect(screen.getByTestId('properties-panel')).toBeInTheDocument()
    expect(screen.getByText('NAND')).toBeInTheDocument()
  })

  it('shows gate position', () => {
    const gate = makeGate({ position: { x: 3, y: 7, z: 0 } })
    setState({ gates: [gate], selectedGateId: gate.id })
    render(<PropertiesPanel />)

    expect(screen.getByTestId('properties-pos-x')).toHaveTextContent('3')
    expect(screen.getByTestId('properties-pos-y')).toHaveTextContent('7')
  })

  it('shows gate rotation in degrees', () => {
    const gate = makeGate({ rotation: { x: 0, y: 0, z: Math.PI / 2 } })
    setState({ gates: [gate], selectedGateId: gate.id })
    render(<PropertiesPanel />)

    expect(screen.getByTestId('properties-rotation')).toHaveTextContent('90')
  })

  it('rotates gate by 90 degrees when +90 button is clicked', () => {
    const gate = makeGate()
    setState({ gates: [gate], selectedGateId: gate.id })
    render(<PropertiesPanel />)

    fireEvent.click(screen.getByTestId('properties-rotate'))

    const updatedGate = getState().gates.find((g) => g.id === gate.id)
    expect(updatedGate?.rotation.z).toBeCloseTo(Math.PI / 2)
  })

  it('deletes gate when delete button is clicked', () => {
    const gate = makeGate()
    setState({ gates: [gate], selectedGateId: gate.id })
    render(<PropertiesPanel />)

    fireEvent.click(screen.getByTestId('properties-delete'))

    expect(getState().gates).toHaveLength(0)
  })

  it('deselects all when close button is clicked', () => {
    const gate = makeGate()
    setState({ gates: [gate], selectedGateId: gate.id })
    render(<PropertiesPanel />)

    fireEvent.click(screen.getByTestId('properties-close'))

    expect(getState().selectedGateId).toBeNull()
  })

  it('renders when a wire is selected', () => {
    const wire = makeWire()
    setState({ wires: [wire], selectedWireId: wire.id })
    render(<PropertiesPanel />)

    expect(screen.getByTestId('properties-panel')).toBeInTheDocument()
    expect(screen.getByText('Wire')).toBeInTheDocument()
    expect(screen.getByTestId('properties-wire-from')).toBeInTheDocument()
    expect(screen.getByTestId('properties-wire-to')).toBeInTheDocument()
  })

  it('deletes wire when delete button is clicked', () => {
    const wire = makeWire()
    setState({ wires: [wire], selectedWireId: wire.id })
    render(<PropertiesPanel />)

    fireEvent.click(screen.getByTestId('properties-delete'))

    expect(getState().wires).toHaveLength(0)
  })

  it('renders when an input node is selected', () => {
    const node = makeInputNode()
    setState({
      inputNodes: [node],
      selectedNodeId: node.id,
      selectedNodeType: 'input',
    })
    render(<PropertiesPanel />)

    expect(screen.getByTestId('properties-panel')).toBeInTheDocument()
    expect(screen.getByText('Input')).toBeInTheDocument()
    expect(screen.getByTestId('properties-label-input')).toBeInTheDocument()
  })

  it('shows default value toggle for input nodes', () => {
    const node = makeInputNode({ value: 0 })
    setState({
      inputNodes: [node],
      selectedNodeId: node.id,
      selectedNodeType: 'input',
    })
    render(<PropertiesPanel />)

    expect(screen.getByTestId('properties-value-display')).toHaveTextContent('0')
    expect(screen.getByTestId('properties-value-toggle')).toBeInTheDocument()
  })

  it('toggles input node value', () => {
    const node = makeInputNode({ value: 0 })
    setState({
      inputNodes: [node],
      selectedNodeId: node.id,
      selectedNodeType: 'input',
    })
    render(<PropertiesPanel />)

    fireEvent.click(screen.getByTestId('properties-value-toggle'))

    const updated = getState().inputNodes.find((n) => n.id === node.id)
    expect(updated?.value).toBe(1)
  })

  it('renames input node on blur', () => {
    const node = makeInputNode({ name: 'A' })
    setState({
      inputNodes: [node],
      selectedNodeId: node.id,
      selectedNodeType: 'input',
    })
    render(<PropertiesPanel />)

    const labelInput = screen.getByTestId('properties-label-input')
    fireEvent.change(labelInput, { target: { value: 'B' } })
    fireEvent.blur(labelInput)

    const updated = getState().inputNodes.find((n) => n.id === node.id)
    expect(updated?.name).toBe('B')
  })

  it('renders when an output node is selected', () => {
    const node = makeOutputNode()
    setState({
      outputNodes: [node],
      selectedNodeId: node.id,
      selectedNodeType: 'output',
    })
    render(<PropertiesPanel />)

    expect(screen.getByTestId('properties-panel')).toBeInTheDocument()
    expect(screen.getByText('Output')).toBeInTheDocument()
  })

  it('deletes input node when delete is clicked', () => {
    const node = makeInputNode()
    setState({
      inputNodes: [node],
      selectedNodeId: node.id,
      selectedNodeType: 'input',
    })
    render(<PropertiesPanel />)

    fireEvent.click(screen.getByTestId('properties-delete'))

    expect(getState().inputNodes).toHaveLength(0)
  })

  it('deletes output node when delete is clicked', () => {
    const node = makeOutputNode()
    setState({
      outputNodes: [node],
      selectedNodeId: node.id,
      selectedNodeType: 'output',
    })
    render(<PropertiesPanel />)

    fireEvent.click(screen.getByTestId('properties-delete'))

    expect(getState().outputNodes).toHaveLength(0)
  })
})
