// The engine: violates `engine-no-state`, `engine-no-ui`, `engine-no-ui-packages` and `src-no-e2e`.
import { createElement } from 'react'
import type { Globals } from '../../e2e/types/globals'
import { widget } from '../components/widget'
import { state } from '../store/state'

export const bad = (globals: Globals) =>
  `${state()}${widget()}${String(createElement)}${String(globals.ready)}`
