import { useCircuitStore } from '@/store/circuitStore'
import { Wire3D } from '@/components/canvas/Wire3D'
import { GateRenderer } from '@/gates'
import { deriveWire3DProps } from '@/components/canvas/deriveWire3DProps'

/**
 * Minimal R3F scene for routing tests. Each wire is wrapped in a <group> tagged
 * with its wireId so the geometry layer can group rendered line segments back to
 * their wire WITHOUT touching production Wire3D/CanvasArea. Deliberately omits
 * OrbitControls / grid / lighting / post-processing — none affect routing
 * geometry. Gate meshes render only when `gates` is true (hybrid degrade path).
 */
export function TestScene({ gates = false, wires = true }: { gates?: boolean; wires?: boolean }) {
  const wireList = useCircuitStore((s) => s.wires)
  const gateList = useCircuitStore((s) => s.gates)
  // eslint-disable-next-line react-compiler/react-compiler -- getState() is valid for reading without subscribing
  const state = useCircuitStore.getState()
  return (
    <>
      {wires &&
        wireList.map((wire) => {
          const { start, end, precomputedPath } = deriveWire3DProps(wire, state)
          return (
            <group key={wire.id} userData={{ hacerWire: true, wireId: wire.id }}>
              <Wire3D start={start} end={end} precomputedPath={precomputedPath} />
            </group>
          )
        })}
      {gates &&
        gateList.map((gate) => (
          <GateRenderer
            key={gate.id}
            gate={gate}
            isWiring={false}
            isPinConnected={() => false}
            onClick={() => {}}
            onPinClick={() => {}}
            onInputToggle={() => {}}
          />
        ))}
    </>
  )
}
