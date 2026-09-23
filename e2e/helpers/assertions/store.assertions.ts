/**
 * Store Assertions
 *
 * Assertions and getters for verifying circuit store state.
 */

import { Page } from '@playwright/test'

/**
 * Get the current name of an input node by ID
 */
export async function getInputNodeName(page: Page, nodeId: string): Promise<string | null> {
  return page.evaluate(({ nodeId }) => {
    const nodes = window.__CIRCUIT_STORE__?.inputNodes
    if (!Array.isArray(nodes)) return null
    const node = nodes.find((n) => n.id === nodeId)
    return node?.name ?? null
  }, { nodeId })
}

/**
 * Get the current name of an output node by ID
 */
export async function getOutputNodeName(page: Page, nodeId: string): Promise<string | null> {
  return page.evaluate(({ nodeId }) => {
    const nodes = window.__CIRCUIT_STORE__?.outputNodes
    if (!Array.isArray(nodes)) return null
    const node = nodes.find((n) => n.id === nodeId)
    return node?.name ?? null
  }, { nodeId })
}
