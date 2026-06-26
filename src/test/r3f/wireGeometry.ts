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

/** Assert a rendered wire's endpoints reach `start` and `end` within tolerance. */
export function expectWireConnects(
  w: RenderedWire,
  start: { x: number; y: number; z: number },
  end: { x: number; y: number; z: number },
  tol = 0.001,
): void {
  const ends = getWireEndpoints(w)
  const startD = ends.start.distanceTo(new Vector3(start.x, start.y, start.z))
  const endD = ends.end.distanceTo(new Vector3(end.x, end.y, end.z))
  if (startD > tol || endD > tol) {
    throw new Error(
      `wire ${w.wireId} does not connect: ` +
        `start rendered (${fmt(ends.start)}) vs expected (${fmt(start)}) Δ=${startD.toFixed(4)}; ` +
        `end rendered (${fmt(ends.end)}) vs expected (${fmt(end)}) Δ=${endD.toFixed(4)} (tol=${tol})`,
    )
  }
}

function fmt(p: { x: number; y: number; z: number }): string {
  return `${p.x.toFixed(3)},${p.y.toFixed(3)},${p.z.toFixed(3)}`
}
