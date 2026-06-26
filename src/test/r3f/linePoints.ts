// SPIKE OUTCOME (Task 1): drei <Line> renders cleanly under @react-three/test-renderer
// on React 19. Its underlying THREE object is a Line2 whose geometry is a
// LineGeometry; the polyline is stored in the interleaved `instanceStart`/
// `instanceEnd` buffer (stride 6: [startXYZ, endXYZ] per sub-segment). We read the
// polyline from that one shared interleaved array: point0 = first start, then each
// segment's end.
//
// GATES_RENDER_UNDER_TEST = true — a real GateRenderer (ChipBody3D) also renders
// cleanly under test-renderer on React 19 (gate-stability probe, Task 1 Step 6).
import { Vector3 } from 'three'
import type { Object3D } from 'three'

interface LineLike extends Object3D {
  geometry?: {
    attributes?: {
      instanceStart?: { data: { array: ArrayLike<number> } }
    }
  }
}

/** True for a rendered drei <Line> (a Line2 backed by a LineGeometry). */
export function isRenderedLine(obj: Object3D): boolean {
  const g = (obj as LineLike).geometry
  return !!g?.attributes?.instanceStart?.data?.array
}

/** Read a rendered drei <Line>'s world-space polyline points, in order. */
export function readLinePoints(obj: Object3D): Vector3[] {
  const g = (obj as LineLike).geometry
  const arr = g?.attributes?.instanceStart?.data?.array
  if (!arr) return []
  const segCount = Math.floor(arr.length / 6)
  const points: Vector3[] = []
  if (segCount > 0) {
    points.push(new Vector3(arr[0], arr[1], arr[2]))
    for (let k = 0; k < segCount; k++) {
      points.push(new Vector3(arr[k * 6 + 3], arr[k * 6 + 4], arr[k * 6 + 5]))
    }
  }
  return points
}
