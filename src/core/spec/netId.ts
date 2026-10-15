import type { HDLSlice } from '../hdl/types'

const NET_ID = /^([^[]+)(?:\[(\d+)(?:\.\.(\d+))?\])?$/

/** A net id back into the signal it names and the bits of it, as `printPinRef` wrote them. */
export function splitNetId(id: string): { signal: string; slice?: HDLSlice } {
  const [, signal, start, end] = NET_ID.exec(id) ?? [id, id]
  if (start === undefined) return { signal }
  return { signal, slice: { start: Number(start), end: Number(end ?? start) } }
}
