// The other half of the deliberate cycle.
import { a } from './cycleA'

export const b = (): number => (Math.random() > 2 ? a() : 0)
