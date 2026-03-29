/**
 * Node Rename Store Tests
 *
 * Tests rename behavior for input/output nodes through window.__CIRCUIT_ACTIONS__.
 *
 * Tag: @store @nodes @rename
 */

import { storeTest as test, storeExpect as expect } from '../../fixtures'
import { DEFAULT_POSITIONS } from '../../config/constants'
import { getInputNodeName, getOutputNodeName } from '../../helpers'

type E2ENode = { id: string; name: string; value: number }

test.describe('Node Rename @store @nodes @rename', () => {
  test('renames an input node with a valid HDL identifier', async ({ page }) => {
    const inputNode = await page.evaluate(({ position }): E2ENode => {
      const actions = window.__CIRCUIT_ACTIONS__
      if (!actions) throw new Error('Circuit actions are unavailable')
      return actions.addInputNode('in0', position)
    }, { position: DEFAULT_POSITIONS.left })

    await page.evaluate(({ nodeId }) => {
      const actions = window.__CIRCUIT_ACTIONS__
      if (!actions) throw new Error('Circuit actions are unavailable')
      actions.renameInputNode(nodeId, 'sel')
    }, { nodeId: inputNode.id })

    expect(await getInputNodeName(page, inputNode.id)).toBe('sel')
  })

  test('rejects case-insensitive duplicate input names', async ({ page }) => {
    const first = await page.evaluate(({ position }): E2ENode => {
      const actions = window.__CIRCUIT_ACTIONS__
      if (!actions) throw new Error('Circuit actions are unavailable')
      return actions.addInputNode('a', position)
    }, { position: DEFAULT_POSITIONS.left })

    await page.evaluate(({ position }) => {
      const actions = window.__CIRCUIT_ACTIONS__
      if (!actions) throw new Error('Circuit actions are unavailable')
      actions.addInputNode('sel', position)
    }, { position: DEFAULT_POSITIONS.center })

    await page.evaluate(({ nodeId }) => {
      const actions = window.__CIRCUIT_ACTIONS__
      if (!actions) throw new Error('Circuit actions are unavailable')
      actions.renameInputNode(nodeId, 'SEL')
    }, { nodeId: first.id })

    expect(await getInputNodeName(page, first.id)).toBe('a')
  })

  test('rejects invalid identifier format for input names', async ({ page }) => {
    const inputNode = await page.evaluate(({ position }): E2ENode => {
      const actions = window.__CIRCUIT_ACTIONS__
      if (!actions) throw new Error('Circuit actions are unavailable')
      return actions.addInputNode('in0', position)
    }, { position: DEFAULT_POSITIONS.left })

    await page.evaluate(({ nodeId }) => {
      const actions = window.__CIRCUIT_ACTIONS__
      if (!actions) throw new Error('Circuit actions are unavailable')
      actions.renameInputNode(nodeId, 'bad-name')
    }, { nodeId: inputNode.id })

    expect(await getInputNodeName(page, inputNode.id)).toBe('in0')
  })

  test('renames an output node with a valid HDL identifier', async ({ page }) => {
    const outputNode = await page.evaluate(({ position }): E2ENode => {
      const actions = window.__CIRCUIT_ACTIONS__
      if (!actions) throw new Error('Circuit actions are unavailable')
      return actions.addOutputNode('out0', position)
    }, { position: DEFAULT_POSITIONS.right })

    await page.evaluate(({ nodeId }) => {
      const actions = window.__CIRCUIT_ACTIONS__
      if (!actions) throw new Error('Circuit actions are unavailable')
      actions.renameOutputNode(nodeId, 'out')
    }, { nodeId: outputNode.id })

    expect(await getOutputNodeName(page, outputNode.id)).toBe('out')
  })
})
