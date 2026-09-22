// The state layer: violates `state-no-ui` and `state-no-3d`.
import { Vector3 } from 'three'
import { widget } from '../components/widget'

export const state = () => `${widget()}${String(new Vector3().x)}`
