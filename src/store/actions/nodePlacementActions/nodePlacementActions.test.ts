/**
 * Tests for node placement actions
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { useCircuitStore } from '../../circuitStore'

describe('Node Placement Actions', () => {
  beforeEach(() => {
    useCircuitStore.setState({
      inputNodes: [],
      outputNodes: [],
      junctions: [],
      nodePlacementMode: null,
      selectedNodeId: null,
      selectedNodeType: null,
      placementPreviewPosition: null,
      selectedGateId: null,
      selectedWireId: null,
      placementMode: null,
    })
  })

  describe('startNodePlacement', () => {
    it('sets nodePlacementMode to INPUT', () => {
      const { startNodePlacement } = useCircuitStore.getState()
      startNodePlacement('INPUT')
      expect(useCircuitStore.getState().nodePlacementMode).toBe('INPUT')
    })

    it('sets nodePlacementMode to OUTPUT', () => {
      const { startNodePlacement } = useCircuitStore.getState()
      startNodePlacement('OUTPUT')
      expect(useCircuitStore.getState().nodePlacementMode).toBe('OUTPUT')
    })

    it('clears any node selection when starting placement', () => {
      useCircuitStore.setState({ selectedNodeId: 'some-node', selectedNodeType: 'input' })
      const { startNodePlacement } = useCircuitStore.getState()
      startNodePlacement('INPUT')
      expect(useCircuitStore.getState().selectedNodeId).toBe(null)
      expect(useCircuitStore.getState().selectedNodeType).toBe(null)
    })

    it('clears gate placementMode when starting node placement', () => {
      useCircuitStore.setState({ placementMode: 'NAND' })
      const { startNodePlacement } = useCircuitStore.getState()
      startNodePlacement('INPUT')
      expect(useCircuitStore.getState().placementMode).toBe(null)
    })
  })

  describe('cancelNodePlacement', () => {
    it('clears nodePlacementMode', () => {
      useCircuitStore.setState({ nodePlacementMode: 'INPUT' })
      const { cancelNodePlacement } = useCircuitStore.getState()
      cancelNodePlacement()
      expect(useCircuitStore.getState().nodePlacementMode).toBe(null)
    })

    it('clears placementPreviewPosition', () => {
      useCircuitStore.setState({
        nodePlacementMode: 'INPUT',
        placementPreviewPosition: { x: 1, y: 0, z: 1 },
      })
      const { cancelNodePlacement } = useCircuitStore.getState()
      cancelNodePlacement()
      expect(useCircuitStore.getState().placementPreviewPosition).toBe(null)
    })
  })

  describe('placeNode', () => {
    it('places an INPUT node with default value true and clears placement mode', () => {
      useCircuitStore.setState({ nodePlacementMode: 'INPUT' })
      const { placeNode } = useCircuitStore.getState()
      placeNode({ x: 2, y: 0.2, z: 3 })

      const state = useCircuitStore.getState()
      expect(state.nodePlacementMode).toBe(null)
      expect(state.inputNodes).toHaveLength(1)
      expect(state.inputNodes[0].name).toMatch(/^in/)
      expect(state.inputNodes[0].position.x).toBe(2)
      expect(state.inputNodes[0].value).toBe(true)
    })

    it('places an OUTPUT node', () => {
      useCircuitStore.setState({ nodePlacementMode: 'OUTPUT' })
      const { placeNode } = useCircuitStore.getState()
      placeNode({ x: 4, y: 0.2, z: 5 })

      const state = useCircuitStore.getState()
      expect(state.outputNodes).toHaveLength(1)
      expect(state.outputNodes[0].name).toMatch(/^out/)
    })

    it('does nothing if not in node placement mode', () => {
      const { placeNode } = useCircuitStore.getState()
      placeNode({ x: 1, y: 0.2, z: 1 })

      const state = useCircuitStore.getState()
      expect(state.inputNodes).toHaveLength(0)
      expect(state.outputNodes).toHaveLength(0)
    })

    it('selects the newly placed node', () => {
      useCircuitStore.setState({ nodePlacementMode: 'INPUT' })
      const { placeNode } = useCircuitStore.getState()
      placeNode({ x: 2, y: 0.2, z: 3 })

      const state = useCircuitStore.getState()
      expect(state.selectedNodeId).toBe(state.inputNodes[0].id)
      expect(state.selectedNodeType).toBe('input')
    })

    it('clears wire selection when placing a node', () => {
      useCircuitStore.setState({
        nodePlacementMode: 'INPUT',
        selectedWireId: 'wire-1',
      })
      const { placeNode } = useCircuitStore.getState()
      placeNode({ x: 2, y: 0.2, z: 3 })

      expect(useCircuitStore.getState().selectedWireId).toBe(null)
    })
  })

  describe('selectNode', () => {
    it('selects an input node', () => {
      const inputNode = { id: 'in-1', name: 'a', position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, value: false, width: 1 }
      useCircuitStore.setState({ inputNodes: [inputNode] })

      const { selectNode } = useCircuitStore.getState()
      selectNode('in-1', 'input')

      const state = useCircuitStore.getState()
      expect(state.selectedNodeId).toBe('in-1')
      expect(state.selectedNodeType).toBe('input')
    })

    it('clears gate selection when selecting a node', () => {
      useCircuitStore.setState({ selectedGateId: 'gate-1' })
      const { selectNode } = useCircuitStore.getState()
      selectNode('in-1', 'input')

      expect(useCircuitStore.getState().selectedGateId).toBe(null)
    })

    it('clears wire selection when selecting a node', () => {
      useCircuitStore.setState({ selectedWireId: 'wire-1' })
      const { selectNode } = useCircuitStore.getState()
      selectNode('in-1', 'input')

      expect(useCircuitStore.getState().selectedWireId).toBe(null)
    })

  })

  describe('deselectNode', () => {
    it('clears node selection', () => {
      useCircuitStore.setState({ selectedNodeId: 'in-1', selectedNodeType: 'input' })
      const { deselectNode } = useCircuitStore.getState()
      deselectNode()

      const state = useCircuitStore.getState()
      expect(state.selectedNodeId).toBe(null)
      expect(state.selectedNodeType).toBe(null)
    })
  })
})
