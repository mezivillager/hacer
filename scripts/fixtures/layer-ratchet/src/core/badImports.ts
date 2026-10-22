// The engine: violates `engine-no-state`, `engine-no-ui`, `engine-no-ui-packages`, `src-no-e2e` and `src-no-conformance`.
import { createElement } from 'react'
import { harness } from '../../conformance/differential/harness'
import type { Globals } from '../../e2e/types/globals'
import { widget } from '../components/widget'
import { state } from '../store/state'

export const bad = (globals: Globals) =>
  `${state()}${widget()}${String(createElement)}${String(globals.ready)}${harness}`
