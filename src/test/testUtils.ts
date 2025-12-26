import type { CircuitStore, CircuitState } from '@/store/types'
import type { ThreeEvent } from '@react-three/fiber'
import { Vector3 } from 'three'

/**
 * Creates a properly typed mock of CircuitStore for testing.
 *
 * This helper avoids the need for double type assertions (`as Partial<CircuitStore> as CircuitStore`)
 * by using TypeScript's type system more safely. The returned value satisfies the CircuitStore
 * interface while allowing you to provide only the properties you need for your test.
 *
 * The action methods are provided as no-ops since they should be mocked separately via `circuitActions`.
 * Only the state properties you provide will be used by the code under test.
 *
 * @example
 * ```ts
 * const mockStore = createMockStore({ wires: [wire1, wire2] })
 * vi.mocked(useCircuitStore.getState).mockReturnValue(mockStore)
 * ```
 *
 * @param partial - Partial state properties to include in the mock
 * @returns A properly typed CircuitStore mock
 */
export function createMockStore(partial: Partial<CircuitState> = {}): CircuitStore {
  // Default state values matching the actual store initialization
  const defaultState: CircuitState = {
    gates: [],
    wires: [],
    selectedGateId: null,
    simulationRunning: false,
    simulationSpeed: 100,
    placementMode: null,
    placementPreviewPosition: null,
    wiringFrom: null,
    isDragActive: false,
    hoveredGateId: null,
  }

  // Merge provided partial state with defaults
  const state = { ...defaultState, ...partial }

  // Return a complete CircuitStore with no-op actions
  // Actions are mocked separately via circuitActions, so these are just placeholders
  return {
    ...state,
    // Action methods (no-ops - mocked separately via circuitActions)
    addGate: () => ({ id: '', type: 'NAND', position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, inputs: [], outputs: [], selected: false }),
    removeGate: () => {},
    selectGate: () => {},
    updateGatePosition: () => {},
    updateGateRotation: () => {},
    rotateGate: () => {},
    addWire: () => ({ id: '', fromGateId: '', fromPinId: '', toGateId: '', toPinId: '' }),
    removeWire: () => {},
    setInputValue: () => {},
    toggleSimulation: () => {},
    setSimulationSpeed: () => {},
    clearCircuit: () => {},
    simulationTick: () => {},
    startPlacement: () => {},
    cancelPlacement: () => {},
    placeGate: () => {},
    updatePlacementPreviewPosition: () => {},
    setDragActive: () => {},
    setHoveredGate: () => {},
    startWiring: () => {},
    updateWirePreviewPosition: () => {},
    cancelWiring: () => {},
    completeWiring: () => {},
    getPinWorldPosition: () => null,
    getPinOrientation: () => null,
  } satisfies CircuitStore
}

/**
 * Creates a properly typed mock ThreeEvent for testing.
 *
 * This helper avoids the need for `as unknown as ThreeEvent<T>` assertions when creating
 * mock events for React Three Fiber handlers.
 *
 * @example
 * ```ts
 * const mockEvent = createMockThreeEvent({ x: 1, y: 2, z: 3 })
 * handlePointerMove(mockEvent)
 * ```
 *
 * @param point - The 3D point where the event occurred
 * @param overrides - Optional additional properties to include in the mock event
 * @returns A properly typed ThreeEvent mock
 */
export function createMockThreeEvent<T extends PointerEvent | MouseEvent>(
  point: { x: number; y: number; z: number },
  overrides?: Partial<ThreeEvent<T>>
): ThreeEvent<T> {
  // Create a proper Vector3 instance for the point property
  // This satisfies ThreeEvent's type requirement without type assertions
  const vector3Point = new Vector3(point.x, point.y, point.z)

  // Create a minimal native event mock
  // We still need to assert the native event type since creating a full native event
  // would require DOM APIs that aren't available in the test environment
  const mockNativeEvent = {
    target: null,
    ...(overrides?.nativeEvent || {}),
  } as T

  const mockEvent = {
    point: vector3Point,
    stopPropagation: () => {},
    nativeEvent: mockNativeEvent,
    ...overrides,
  }

  // We still need a type assertion for the nativeEvent property since we can't
  // create a full native event object in tests. Using Vector3 for point eliminates
  // the main type safety issue. The `as unknown as` pattern is necessary because
  // ThreeEvent has many properties we don't need for testing.
  return mockEvent as unknown as ThreeEvent<T>
}
