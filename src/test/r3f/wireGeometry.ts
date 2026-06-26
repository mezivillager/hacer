import { Vector3 } from 'three'
import type { Object3D } from 'three'
import { isRenderedLine, readLinePoints } from './linePoints'
import type { SceneTestHandle } from './renderCircuitScene'

export interface RenderedWire {
  wireId: string
  /** One entry per rendered drei <Line> (i.e. per stored wire segment). */
  segments: { points: Vector3[] }[]
  /** Concatenated polyline across all segments, deduplicating shared corners. */
  polyline: Vector3[]
}

/** Walk the scene, grouping rendered line segments back to their wire by the
 *  wireId tag on each wire's wrapping <group>. */
export function getRenderedWirePolylines(handle: SceneTestHandle): RenderedWire[] {
  const wires: RenderedWire[] = []
  handle.scene.traverse((obj: Object3D) => {
    if (!obj.userData?.hacerWire) return
    const segments: { points: Vector3[] }[] = []
    obj.traverse((child: Object3D) => {
      if (isRenderedLine(child)) segments.push({ points: readLinePoints(child) })
    })
    const polyline = segments.flatMap((s, i) => (i === 0 ? s.points : s.points.slice(1)))
    wires.push({ wireId: obj.userData.wireId as string, segments, polyline })
  })
  return wires
}

export function getWireEndpoints(w: RenderedWire): { start: Vector3; end: Vector3 } {
  return { start: w.polyline[0], end: w.polyline[w.polyline.length - 1] }
}
