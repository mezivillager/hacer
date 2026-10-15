// An adapter beside the meshes: it reads the store and passes props down, which `mesh-no-state` allows.
import { state } from '../store/state'

export const nodeRenderer = () => state()
