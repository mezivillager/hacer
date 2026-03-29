import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { useCircuitStore } from '@/store/circuitStore'
import { NodeRenameControl } from './NodeRenameControl'

const { messageError } = vi.hoisted(() => ({
  messageError: vi.fn(),
}))

vi.mock('antd', async () => {
  const actual = await vi.importActual<typeof import('antd')>('antd')
  return {
    ...actual,
    message: {
      ...actual.message,
      error: messageError,
    },
  }
})

describe('NodeRenameControl', () => {
  beforeEach(() => {
    messageError.mockReset()
    useCircuitStore.setState({
      gates: [],
      wires: [],
      selectedGateId: null,
      selectedWireId: null,
      simulationRunning: false,
      simulationSpeed: 100,
      placementMode: null,
      placementPreviewPosition: null,
      wiringFrom: null,
      isDragActive: false,
      hoveredGateId: null,
      showAxes: false,
      inputNodes: [],
      outputNodes: [],
      junctions: [],
      nodePlacementMode: null,
      selectedNodeId: null,
      selectedNodeType: null,
      junctionPlacementMode: null,
      junctionPreviewPosition: null,
      junctionPreviewWireId: null,
    })
  })

  it('does not render when no node is selected', () => {
    const { container } = render(<NodeRenameControl />)

    expect(container.firstChild).toBeNull()
  })

  it('shows selected input node name in the text input', () => {
    const store = useCircuitStore.getState()
    const node = store.addInputNode('in0', { x: 0, y: 0, z: 0 })
    store.selectNode(node.id, 'input')

    render(<NodeRenameControl />)

    const input = screen.getByTestId('node-rename-input')
    expect(input).toHaveValue('in0')
  })

  it('renames selected input node when apply is clicked', () => {
    const store = useCircuitStore.getState()
    const node = store.addInputNode('in0', { x: 0, y: 0, z: 0 })
    store.selectNode(node.id, 'input')

    render(<NodeRenameControl />)

    fireEvent.change(screen.getByTestId('node-rename-input'), { target: { value: 'sel' } })
    fireEvent.click(screen.getByTestId('node-rename-apply'))

    const updated = useCircuitStore.getState().inputNodes.find((n) => n.id === node.id)
    expect(updated?.name).toBe('sel')
    expect(messageError).not.toHaveBeenCalled()
  })

  it('shows feedback and keeps name unchanged when duplicate is submitted', () => {
    const store = useCircuitStore.getState()
    const first = store.addInputNode('a', { x: 0, y: 0, z: 0 })
    store.addInputNode('sel', { x: 0, y: 0, z: 4 })
    store.selectNode(first.id, 'input')

    render(<NodeRenameControl />)

    fireEvent.change(screen.getByTestId('node-rename-input'), { target: { value: 'SEL' } })
    fireEvent.click(screen.getByTestId('node-rename-apply'))

    const updated = useCircuitStore.getState().inputNodes.find((n) => n.id === first.id)
    expect(updated?.name).toBe('a')
    expect(messageError).toHaveBeenCalledTimes(1)
  })

  it('renames selected output node', () => {
    const store = useCircuitStore.getState()
    const node = store.addOutputNode('out0', { x: 8, y: 0, z: 0 })
    store.selectNode(node.id, 'output')

    render(<NodeRenameControl />)

    fireEvent.change(screen.getByTestId('node-rename-input'), { target: { value: 'out' } })
    fireEvent.click(screen.getByTestId('node-rename-apply'))

    const updated = useCircuitStore.getState().outputNodes.find((n) => n.id === node.id)
    expect(updated?.name).toBe('out')
  })
})
