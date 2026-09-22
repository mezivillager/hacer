// Half of the deliberate cycle that `no-circular` must catch.
import { b } from './cycleB'

export const a = (): number => b() + 1
