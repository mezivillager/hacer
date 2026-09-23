// The rendering layer. Everything below may be imported BY it and must never import it.
// Violates `core-through-index`: past the front door, straight into a module's internals.
import { internal } from '../core/internal'

export const widget = () => `widget${internal()}`
