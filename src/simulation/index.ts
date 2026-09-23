// src/simulation/index.ts — RED STUB (#336). Replaced by the real re-exports in the green commit.
import type * as busOps from './busOps'

const todo = (): never => {
  throw new Error('src/simulation/index.ts: the simulation front door is not wired up yet (#336)')
}

export const clampToWidth: typeof busOps.clampToWidth = todo
export const maskForWidth: typeof busOps.maskForWidth = todo
export const readSubBus: typeof busOps.readSubBus = todo
export const writeSubBus: typeof busOps.writeSubBus = todo
