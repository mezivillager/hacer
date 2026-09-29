// A surface: violates `surfaces-through-core` by importing the store instead of `../core`.
import { state } from '../store/state'

export const cliState = () => state()
