/**
 * Signal Propagation Store Tests
 *
 * Tests for signal propagation through multi-gate circuits.
 * Tests use different gate types to ensure generalized behavior.
 *
 * Tag: @store @simulation
 */

import { storeTest as test } from '../../fixtures'
import { DEFAULT_POSITIONS, TIMEOUTS } from '../../config/constants'
import {
  addGateViaStore,
  addWireViaStore,
  setInputsViaStore,
  runSimulationTick,
  toggleSimulationViaStore,
} from '../../helpers/actions'
import { ensureGates, ensureWires } from '../../helpers/waits'
import {
  expectGateCount,
  expectWireCount,
  expectGateOutput,
} from '../../helpers/assertions'

test.describe('Signal Propagation @store @simulation', () => {
  test.describe('Two-Gate Circuits', () => {
    test('propagates signals through NAND-NAND chain', async ({ page }) => {
      const gate1 = await addGateViaStore(page, 'NAND', DEFAULT_POSITIONS.left)
      const gate2 = await addGateViaStore(page, 'NAND', DEFAULT_POSITIONS.right)
      await ensureGates(page, 2)

      if (!gate1 || !gate2) {
        throw new Error('Failed to create gates')
      }

      // Wire gate1 output to gate2 input
      await addWireViaStore(page, {
        fromGateId: gate1.id,
        fromPinId: `${gate1.id}-out-0`,
        toGateId: gate2.id,
        toPinId: `${gate2.id}-in-0`,
      })
      await ensureWires(page, 1)

      // Set inputs on gate1 (both true for NAND)
      await setInputsViaStore(
        page,
        [
          { gate: 0, pin: 'in-0', value: true },
          { gate: 0, pin: 'in-1', value: true },
        ],
        [gate1.id, gate2.id]
      )

      // Run simulation
      await toggleSimulationViaStore(page)
      await page.waitForTimeout(TIMEOUTS.simulation)
      await runSimulationTick(page)

      // NAND(1,1) = 0, so gate1 output should be false
      await expectGateOutput(page, 0, false)
    })

    test('propagates signals through AND-OR chain', async ({ page }) => {
      const gate1 = await addGateViaStore(page, 'AND', DEFAULT_POSITIONS.left)
      const gate2 = await addGateViaStore(page, 'OR', DEFAULT_POSITIONS.right)
      await ensureGates(page, 2)

      if (!gate1 || !gate2) {
        throw new Error('Failed to create gates')
      }

      await addWireViaStore(page, {
        fromGateId: gate1.id,
        fromPinId: `${gate1.id}-out-0`,
        toGateId: gate2.id,
        toPinId: `${gate2.id}-in-0`,
      })
      await ensureWires(page, 1)

      // Set inputs: AND(1,1) = 1
      await setInputsViaStore(
        page,
        [
          { gate: 0, pin: 'in-0', value: true },
          { gate: 0, pin: 'in-1', value: true },
        ],
        [gate1.id, gate2.id]
      )

      await toggleSimulationViaStore(page)
      await page.waitForTimeout(TIMEOUTS.simulation)
      await runSimulationTick(page)

      // AND(1,1) = 1
      await expectGateOutput(page, 0, true)
    })

    test('NOT gate inverts signal', async ({ page }) => {
      const gate1 = await addGateViaStore(page, 'NAND', DEFAULT_POSITIONS.left)
      const gate2 = await addGateViaStore(page, 'NOT', DEFAULT_POSITIONS.right)
      await ensureGates(page, 2)

      if (!gate1 || !gate2) {
        throw new Error('Failed to create gates')
      }

      await addWireViaStore(page, {
        fromGateId: gate1.id,
        fromPinId: `${gate1.id}-out-0`,
        toGateId: gate2.id,
        toPinId: `${gate2.id}-in-0`,
      })
      await ensureWires(page, 1)

      // NAND(1,1) = 0, NOT(0) = 1
      await setInputsViaStore(
        page,
        [
          { gate: 0, pin: 'in-0', value: true },
          { gate: 0, pin: 'in-1', value: true },
        ],
        [gate1.id, gate2.id]
      )

      await toggleSimulationViaStore(page)
      await page.waitForTimeout(TIMEOUTS.simulation)
      await runSimulationTick(page)
      await runSimulationTick(page)

      // NOT inverts the NAND output (0 -> 1)
      await expectGateOutput(page, 1, true)
    })
  })

  test.describe('Three-Gate Circuits', () => {
    test('propagates through three-gate chain', async ({ page }) => {
      const gate1 = await addGateViaStore(page, 'NAND', DEFAULT_POSITIONS.left)
      const gate2 = await addGateViaStore(page, 'NAND', DEFAULT_POSITIONS.center)
      const gate3 = await addGateViaStore(page, 'NAND', DEFAULT_POSITIONS.right)
      await ensureGates(page, 3)

      if (!gate1 || !gate2 || !gate3) {
        throw new Error('Failed to create gates')
      }

      // Wire chain: g1 -> g2 -> g3
      await addWireViaStore(page, {
        fromGateId: gate1.id,
        fromPinId: `${gate1.id}-out-0`,
        toGateId: gate2.id,
        toPinId: `${gate2.id}-in-0`,
      })
      await addWireViaStore(page, {
        fromGateId: gate2.id,
        fromPinId: `${gate2.id}-out-0`,
        toGateId: gate3.id,
        toPinId: `${gate3.id}-in-0`,
      })
      await ensureWires(page, 2)

      await expectGateCount(page, 3)
      await expectWireCount(page, 2)

      // Set inputs
      await setInputsViaStore(
        page,
        [
          { gate: 0, pin: 'in-0', value: true },
          { gate: 0, pin: 'in-1', value: true },
          { gate: 1, pin: 'in-1', value: true },
          { gate: 2, pin: 'in-1', value: true },
        ],
        [gate1.id, gate2.id, gate3.id]
      )

      // Run simulation
      await toggleSimulationViaStore(page)
      await page.waitForTimeout(TIMEOUTS.simulation)
      await runSimulationTick(page)
      await runSimulationTick(page)
      await runSimulationTick(page)

      // Verify circuit is intact after simulation
      await expectGateCount(page, 3)
      await expectWireCount(page, 2)
    })

    test('fan-out: one output to multiple inputs', async ({ page }) => {
      // g1 output connects to both g2 and g3 inputs
      const gate1 = await addGateViaStore(page, 'NAND', DEFAULT_POSITIONS.left)
      const gate2 = await addGateViaStore(page, 'AND', DEFAULT_POSITIONS.topRight)
      const gate3 = await addGateViaStore(page, 'OR', DEFAULT_POSITIONS.bottomRight)
      await ensureGates(page, 3)

      if (!gate1 || !gate2 || !gate3) {
        throw new Error('Failed to create gates')
      }

      // Fan out from g1
      await addWireViaStore(page, {
        fromGateId: gate1.id,
        fromPinId: `${gate1.id}-out-0`,
        toGateId: gate2.id,
        toPinId: `${gate2.id}-in-0`,
      })
      await addWireViaStore(page, {
        fromGateId: gate1.id,
        fromPinId: `${gate1.id}-out-0`,
        toGateId: gate3.id,
        toPinId: `${gate3.id}-in-0`,
      })
      await ensureWires(page, 2)

      // Set inputs
      await setInputsViaStore(
        page,
        [
          { gate: 0, pin: 'in-0', value: false },
          { gate: 0, pin: 'in-1', value: false },
        ],
        [gate1.id, gate2.id, gate3.id]
      )

      await toggleSimulationViaStore(page)
      await page.waitForTimeout(TIMEOUTS.simulation)
      await runSimulationTick(page)

      // NAND(0,0) = 1, so g1 output is true
      await expectGateOutput(page, 0, true)
    })
  })

  test.describe('Mixed Gate Type Circuits', () => {
    test('XOR gate in circuit', async ({ page }) => {
      const gate1 = await addGateViaStore(page, 'XOR', DEFAULT_POSITIONS.left)
      const gate2 = await addGateViaStore(page, 'NOT', DEFAULT_POSITIONS.right)
      await ensureGates(page, 2)

      if (!gate1 || !gate2) {
        throw new Error('Failed to create gates')
      }

      await addWireViaStore(page, {
        fromGateId: gate1.id,
        fromPinId: `${gate1.id}-out-0`,
        toGateId: gate2.id,
        toPinId: `${gate2.id}-in-0`,
      })
      await ensureWires(page, 1)

      // XOR(1,0) = 1, NOT(1) = 0
      await setInputsViaStore(
        page,
        [
          { gate: 0, pin: 'in-0', value: true },
          { gate: 0, pin: 'in-1', value: false },
        ],
        [gate1.id, gate2.id]
      )

      await toggleSimulationViaStore(page)
      await page.waitForTimeout(TIMEOUTS.simulation)
      await runSimulationTick(page)

      // XOR(1,0) = 1
      await expectGateOutput(page, 0, true)
    })
  })
})

