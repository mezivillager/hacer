/**
 * Elementary Gates Store Tests
 * 
 * Tests for adding gates via store (faster, for setup/teardown)
 */

import { test, expect } from '../fixtures'
import { DEFAULT_POSITIONS } from '../config/constants'
import {
  addGateViaStore,
  getGateIds,
  getGateType,
  clearAllViaUI,
} from '../helpers/actions'
import { ensureGates } from '../helpers/waits'
import { expectGateCount } from '../helpers/assertions'
import type { GateType } from '../helpers/actions/gate.actions'

const gateTypes: GateType[] = ['NAND', 'AND', 'OR', 'NOT', 'XOR']

// Tag for filtering: @store @elementary-gates
test.describe('Elementary Gates (Store) @store @elementary-gates', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing gates before each test
    await clearAllViaUI(page)
  })

  for (const gateType of gateTypes) {
    test(`can add ${gateType} gate via store`, async ({ page }) => {
      const result = await addGateViaStore(page, gateType, DEFAULT_POSITIONS.center)
      
      expect(result).not.toBeNull()
      expect(result?.id).toBeDefined()
      
      await ensureGates(page, 1)
      await expectGateCount(page, 1)
      
      // Verify the gate type is correct
      const gateIds = await getGateIds(page)
      const actualType = await getGateType(page, gateIds[0])
      expect(actualType).toBe(gateType)
    })
  }

  test('can add multiple different gate types via store', async ({ page }) => {
    const positions = [
      DEFAULT_POSITIONS.left,
      DEFAULT_POSITIONS.center,
      DEFAULT_POSITIONS.right,
    ]
    
    for (let i = 0; i < gateTypes.length && i < positions.length; i++) {
      await addGateViaStore(page, gateTypes[i], positions[i])
    }
    
    await ensureGates(page, Math.min(gateTypes.length, positions.length))
    await expectGateCount(page, Math.min(gateTypes.length, positions.length))
    
    // Verify all gate types are present
    const gateIds = await getGateIds(page)
    const types = await Promise.all(
      gateIds.map((id) => getGateType(page, id))
    )
    
    for (let i = 0; i < Math.min(gateTypes.length, positions.length); i++) {
      expect(types[i]).toBe(gateTypes[i])
    }
  })

  test('NOT gate has correct pin configuration', async ({ page }) => {
    await addGateViaStore(page, 'NOT', DEFAULT_POSITIONS.center)
    
    await ensureGates(page, 1)
    const gateIds = await getGateIds(page)
    const gateId = gateIds[0]
    
    // Verify NOT gate has 1 input and 1 output
    const gateInfo = await page.evaluate((id) => {
      const gate = window.__CIRCUIT_STORE__?.gates.find((g) => g.id === id)
      return {
        inputCount: gate?.inputs.length ?? 0,
        outputCount: gate?.outputs.length ?? 0,
        inputIds: gate?.inputs.map((p) => p.id) ?? [],
        outputIds: gate?.outputs.map((p) => p.id) ?? [],
      }
    }, gateId)
    
    expect(gateInfo.inputCount).toBe(1)
    expect(gateInfo.outputCount).toBe(1)
    expect(gateInfo.inputIds[0]).toContain('-in-0')
    expect(gateInfo.outputIds[0]).toContain('-out-0')
  })

  test('two-input gates have correct pin configuration', async ({ page }) => {
    const twoInputGates: GateType[] = ['NAND', 'AND', 'OR', 'XOR']
    
    for (const gateType of twoInputGates) {
      await clearAllViaUI(page)
      
      await addGateViaStore(page, gateType, DEFAULT_POSITIONS.center)
      
      await ensureGates(page, 1)
      const gateIds = await getGateIds(page)
      const gateId = gateIds[0]
      
      // Verify gate has 2 inputs and 1 output
      const gateInfo = await page.evaluate((id) => {
        const gate = window.__CIRCUIT_STORE__?.gates.find((g) => g.id === id)
        return {
          inputCount: gate?.inputs.length ?? 0,
          outputCount: gate?.outputs.length ?? 0,
          inputIds: gate?.inputs.map((p) => p.id) ?? [],
          outputIds: gate?.outputs.map((p) => p.id) ?? [],
        }
      }, gateId)
      
      expect(gateInfo.inputCount).toBe(2)
      expect(gateInfo.outputCount).toBe(1)
      expect(gateInfo.inputIds[0]).toContain('-in-0')
      expect(gateInfo.inputIds[1]).toContain('-in-1')
      expect(gateInfo.outputIds[0]).toContain('-out-0')
    }
  })
})
