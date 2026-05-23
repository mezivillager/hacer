import { test, expect } from '../../fixtures/store.fixture'

test.describe('Circuit persistence @store @persistence', () => {
  test.beforeEach(async ({ page }) => {
    await page.evaluate(() => {
      const actions = window.__CIRCUIT_ACTIONS__
      if (!actions) return
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('hacer-circuit-')) localStorage.removeItem(key)
      })
      actions.clearCircuit()
    })
  })

  test('save -> clearCircuit -> load restores gates, wires, and I/O nodes', async ({ page }) => {
    const summary = await page.evaluate(() => {
      const actions = window.__CIRCUIT_ACTIONS__
      if (!actions) throw new Error('circuitActions not available')
      const input = actions.addInputNode('a', { x: -4, y: 0, z: 0 })
      const output = actions.addOutputNode('out', { x: 4, y: 0, z: 0 })
      const nand = actions.addGate('NAND', { x: 0, y: 0, z: 0 })
      actions.addWire(
        { type: 'input', entityId: input.id },
        { type: 'gate', entityId: nand.id, pinId: `${nand.id}-in-0` },
        [{ start: { x: -3, y: 0.2, z: 0 }, end: { x: -1, y: 0.2, z: 0 }, type: 'horizontal' }],
      )
      actions.addWire(
        { type: 'input', entityId: input.id },
        { type: 'gate', entityId: nand.id, pinId: `${nand.id}-in-1` },
        [{ start: { x: -3, y: 0.2, z: 0 }, end: { x: -1, y: 0.2, z: 0.6 }, type: 'horizontal' }],
      )
      actions.addWire(
        { type: 'gate', entityId: nand.id, pinId: `${nand.id}-out-0` },
        { type: 'output', entityId: output.id },
        [{ start: { x: 1, y: 0.2, z: 0 }, end: { x: 3, y: 0.2, z: 0 }, type: 'horizontal' }],
      )
      actions.updateInputNodeValue(input.id, 1)
      actions.saveCircuit('not-from-nand')
      return {
        inputId: input.id,
        outputId: output.id,
        nandId: nand.id,
      }
    })

    await page.evaluate(() => window.__CIRCUIT_ACTIONS__?.clearCircuit())
    expect(await page.evaluate(() => window.__CIRCUIT_STORE__?.gates.length)).toBe(0)

    const loaded = await page.evaluate(() => window.__CIRCUIT_ACTIONS__?.loadCircuit('not-from-nand'))
    expect(loaded).toBe(true)

    const state = await page.evaluate(() => {
      const s = window.__CIRCUIT_STORE__
      return {
        gates: s?.gates.map((g) => g.id) ?? [],
        wires: s?.wires.length ?? 0,
        inputs: s?.inputNodes?.map((n) => ({ id: n.id, value: n.value })) ?? [],
        outputs: s?.outputNodes?.map((n) => ({ id: n.id, value: n.value })) ?? [],
      }
    })

    expect(state.gates).toEqual([summary.nandId])
    expect(state.wires).toBe(3)
    expect(state.inputs).toEqual([{ id: summary.inputId, value: 1 }])
    expect(state.outputs[0].id).toBe(summary.outputId)
    expect(state.outputs[0].value).toBe(0)
  })

  test('import JSON round-trip reproduces the source state', async ({ page }) => {
    const exported = await page.evaluate(() => {
      const actions = window.__CIRCUIT_ACTIONS__
      if (!actions) throw new Error('actions missing')
      actions.addGate('NAND', { x: 0, y: 0, z: 0 })
      actions.saveCircuit('export-source')
      const raw = localStorage.getItem('hacer-circuit-export-source')
      if (!raw) throw new Error('expected localStorage entry to exist')
      return raw
    })

    await page.evaluate(() => window.__CIRCUIT_ACTIONS__?.clearCircuit())

    const imported = await page.evaluate(
      (blob) => window.__CIRCUIT_ACTIONS__?.importCircuitJSON(blob),
      exported,
    )
    expect(imported).toBe(true)

    const gateCount = await page.evaluate(() => window.__CIRCUIT_STORE__?.gates.length ?? 0)
    expect(gateCount).toBe(1)
  })

  test('listSavedCircuits returns saved circuits and excludes the autosave slot', async ({ page }) => {
    await page.evaluate(() => {
      const actions = window.__CIRCUIT_ACTIONS__!
      actions.addGate('NAND', { x: 0, y: 0, z: 0 })
      actions.saveCircuit('alpha')
      actions.addGate('AND', { x: 4, y: 0, z: 0 })
      actions.saveCircuit('beta')
    })

    const list = await page.evaluate(
      () => window.__CIRCUIT_ACTIONS__?.listSavedCircuits().map((e) => e.name) ?? [],
    )
    expect(list).toEqual(expect.arrayContaining(['alpha', 'beta']))
    expect(list).not.toContain('__autosave__')
  })
})
