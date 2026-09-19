/**
 * UI tour — the product role's eyes (#269, docs/harness/product-brief.md).
 *
 * Walks the app's main screens and flows and saves, per step, a full-page screenshot and an
 * accessibility snapshot: tour-output/<nn>-<step>.png and .json, plus tour-output/tour.json (the
 * step list). DOM controls are clicked as a user would. What needs a pointer on the 3D canvas —
 * placing, wiring, selecting — calls the store actions the canvas handlers call, through the bridge
 * (window.__CIRCUIT_ACTIONS__), because synthetic pointer events do not reach R3F reliably.
 *
 * Tag: @tour, outside the @store and @ui runs. Cloud only (ADR-0016): .github/workflows/ui-tour.yml
 * runs it; it never runs on a laptop.
 */

import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { test, expect, type Page } from '@playwright/test'
import { calculateNodePinPosition } from '@/nodes/config/nodeConfig'
import { UI_SELECTORS } from '../selectors'
import { selectIoViaToolbar, setThemeViaToolbar } from '../helpers/actions'

type Pos = { x: number; y: number; z: number }

const OUT = 'tour-output'
const SAVED = 'my-nand'
// Odd grid cells (section interiors) that the default camera frames even with the drawer open.
const NAND: Pos = { x: -2, y: 0.2, z: -2 }
const IN0: Pos = { x: -6, y: 0.2, z: -6 }
const IN1: Pos = { x: -6, y: 0.2, z: -2 }
const OUT0: Pos = { x: 2, y: 0.2, z: -2 }

const steps: Array<{ file: string; did: string }> = []

/** World position of an I/O node's pin, from the layout the node renders with. */
function pinOf(at: Pos, kind: 'input' | 'output'): Pos {
  const d = calculateNodePinPosition(kind)
  return { x: at.x + d.x, y: at.y + d.y, z: at.z + d.z }
}

/** Save <nn>-<name>.png and .json for the screen as it is now, and list it in tour.json. */
async function capture(page: Page, name: string, did: string): Promise<void> {
  // Fonts loaded and two frames drawn (DOM and WebGL); the pause lets transitions finish.
  await page.evaluate(async () => {
    await document.fonts.ready
    await new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done())))
  })
  await page.waitForTimeout(300)
  const file = `${String(steps.length + 1).padStart(2, '0')}-${name}`
  await page.screenshot({ path: `${OUT}/${file}.png`, fullPage: true, animations: 'disabled' })
  const doc = await page.evaluate(() => ({
    title: document.title,
    lang: document.documentElement.lang,
    theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
  }))
  // Roles, names and states, each element with its box in CSS px: [box=x,y,width,height].
  const aria = (await page.ariaSnapshot({ boxes: true })).split('\n')
  const record = { step: file, did, url: page.url(), viewport: page.viewportSize(), ...doc, aria }
  writeFileSync(`${OUT}/${file}.json`, `${JSON.stringify(record, null, 2)}\n`)
  steps.push({ file, did })
  const manifest = { commit: process.env.GITHUB_SHA ?? 'local', steps }
  writeFileSync(`${OUT}/tour.json`, `${JSON.stringify(manifest, null, 2)}\n`)
}

/** Load or reload as a visitor does: no ?notour, so the Quick tour card shows. */
async function openApp(page: Page, how: 'goto' | 'reload'): Promise<void> {
  if (how === 'goto') await page.goto('/')
  else await page.reload()
  // SwiftShader draws the first frame slowly; allow more than the suites' 10 s.
  await page.waitForFunction(() => window.__SCENE_READY__ === true, undefined, { timeout: 30_000 })
  await expect(page.locator(`${UI_SELECTORS.demoOverlay} img`)).toHaveJSProperty('complete', true, {
    timeout: 10_000,
  })
}

async function closeDemo(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Close demo' }).click()
  await expect(page.locator(UI_SELECTORS.demoOverlay)).toBeHidden()
}

async function loadFromLibrary(page: Page): Promise<void> {
  await page.getByTestId('right-bar-library-trigger').click()
  await page.getByTestId(`library-load-${SAVED}`).click()
  await page.waitForFunction(() => window.__CIRCUIT_STORE__?.wires.length === 3)
}

/** Pick a theme, then close the menu with its trigger (Escape would also deselect the gate). */
async function setTheme(page: Page, theme: 'light' | 'dark' | 'system'): Promise<void> {
  await setThemeViaToolbar(page, theme)
  await page.click(UI_SELECTORS.toolbar.themeTrigger)
  await expect(page.locator(UI_SELECTORS.toolbar.themeOption(theme))).toBeHidden()
}

type WirePlan =
  | { from: { node: string; at: Pos }; to: { gate: string; pin: string } }
  | { from: { gate: string; pin: string }; to: { node: string; at: Pos } }

/**
 * Wire as the pointer does: press the first pin, hover the second — the live preview routes the
 * wire and stores its segments — then click it.
 */
async function wire(page: Page, plan: WirePlan, whileHovering?: () => Promise<void>): Promise<void> {
  const before = await page.evaluate(() => window.__CIRCUIT_STORE__?.wires.length ?? 0)
  await page.evaluate(({ from, to }) => {
    const a = window.__CIRCUIT_ACTIONS__!
    if ('node' in from) a.startWiringFromNode(from.node, 'input', from.at)
    else a.startWiring(from.gate, from.pin, 'output', a.getPinWorldPosition(from.gate, from.pin)!)
    if ('node' in to) a.setDestinationNode(to.node, 'output')
    else a.setDestinationPin(to.gate, to.pin)
    a.updateWirePreviewPosition('node' in to ? to.at : a.getPinWorldPosition(to.gate, to.pin))
  }, plan)
  await page.waitForFunction(() => (window.__CIRCUIT_STORE__?.wiringFrom?.segments?.length ?? 0) > 0)
  if (whileHovering) await whileHovering()
  await page.evaluate(({ to }) => {
    const a = window.__CIRCUIT_ACTIONS__!
    if ('node' in to) a.completeWiringToNode(to.node, 'output')
    else a.completeWiringFromNodeToGate(to.gate, to.pin, 'input')
  }, plan)
  await page.waitForFunction((n) => window.__CIRCUIT_STORE__?.wires.length === n, before + 1)
}

test.describe('App tour @tour', () => {
  test.use({ actionTimeout: 15_000 })

  test('walks the main screens and flows', async ({ page }) => {
    test.setTimeout(6 * 60_000)
    // A retry starts from an empty folder, so the artifact never mixes two attempts.
    rmSync(OUT, { recursive: true, force: true })
    mkdirSync(OUT, { recursive: true })
    steps.length = 0

    await openApp(page, 'goto')
    await capture(page, 'first-visit', 'Opened the app for the first time')
    await closeDemo(page)
    await capture(page, 'empty-canvas', 'Closed the Quick tour card')

    // Placing: the palettes are clicked; the canvas click is the store action it triggers.
    await page.click(UI_SELECTORS.toolbar.gatesTrigger)
    await expect(page.locator(UI_SELECTORS.gatesPopover.root)).toBeVisible()
    await capture(page, 'toolbar-gates', 'Opened the Gates palette')
    await page.click(UI_SELECTORS.gatesPopover.getGate('Nand'))
    await page.waitForFunction(() => window.__CIRCUIT_STORE__?.placementMode === 'Nand')
    await page.evaluate((at) => window.__CIRCUIT_ACTIONS__?.updatePlacementPreviewPosition(at), NAND)
    await capture(page, 'placing-nand', 'Picked Nand and moved the pointer over a free grid cell')
    await page.evaluate((at) => window.__CIRCUIT_ACTIONS__?.placeGate(at), NAND)
    await page.click(UI_SELECTORS.toolbar.ioTrigger)
    await expect(page.locator(UI_SELECTORS.ioPopover.root)).toBeVisible()
    await capture(page, 'toolbar-io', 'Placed the Nand, then opened the Circuit I/O palette')
    await page.click(UI_SELECTORS.ioPopover.input)
    await page.evaluate((at) => window.__CIRCUIT_ACTIONS__?.placeNode(at), IN0)
    await selectIoViaToolbar(page, 'input')
    await page.evaluate((at) => window.__CIRCUIT_ACTIONS__?.placeNode(at), IN1)
    await selectIoViaToolbar(page, 'output')
    await page.evaluate((at) => window.__CIRCUIT_ACTIONS__?.placeNode(at), OUT0)
    const ids = await page.evaluate(() => {
      const s = window.__CIRCUIT_STORE__
      const [in0, in1] = s?.inputNodes ?? []
      return { nand: s?.gates[0]?.id ?? '', in0: in0?.id ?? '', in1: in1?.id ?? '', out0: s?.outputNodes?.[0]?.id ?? '' }
    })
    expect(Object.values(ids)).not.toContain('')
    await capture(page, 'placed', 'Placed a Nand, inputs in0 and in1, and output out0')

    // Wiring
    const nandPin = (pin: string) => ({ gate: ids.nand, pin: `${ids.nand}-${pin}` })
    await wire(page, { from: { node: ids.in0, at: pinOf(IN0, 'input') }, to: nandPin('in-0') }, () =>
      capture(page, 'wiring', 'Started a wire at in0 and hovered the first Nand input'))
    await wire(page, { from: { node: ids.in1, at: pinOf(IN1, 'input') }, to: nandPin('in-1') })
    await wire(page, { from: nandPin('out-0'), to: { node: ids.out0, at: pinOf(OUT0, 'output') } })
    await capture(page, 'wired', 'Wired in0 and in1 into the Nand, and the Nand into out0')

    // Running, inspecting, toggling
    await page.click(UI_SELECTORS.toolbar.simToggle)
    await page.waitForFunction(() => window.__CIRCUIT_STORE__?.simulationRunning === true)
    await capture(page, 'simulation-running', 'Started the simulation from the toolbar')
    await page.click(UI_SELECTORS.rightBar.infoTrigger)
    await expect(page.getByTestId('pinout-panel')).toBeVisible()
    await capture(page, 'drawer-info', 'Opened Circuit Info: the counts and the chip pinout')
    await page.getByTestId('pin-toggle-in0').click()
    await page.waitForFunction(() => window.__CIRCUIT_STORE__?.inputNodes?.[0]?.value === 0)
    await capture(page, 'input-toggled', 'Toggled in0 from 1 to 0 in the pinout while the simulation runs')
    await page.evaluate((id) => window.__CIRCUIT_ACTIONS__?.selectGate(id), ids.nand)
    await page.click(UI_SELECTORS.toolbar.propertiesToggle)
    await expect(page.locator(UI_SELECTORS.propertiesPanel.root)).toBeVisible()
    await capture(page, 'properties', 'Selected the Nand and opened Properties from the toolbar')
    await page.click(UI_SELECTORS.propertiesPanel.closeButton)

    // The other drawer panels and the test lab
    await page.getByTestId('right-bar-tests-trigger').click()
    await expect(page.getByTestId('test-results-panel')).toBeVisible()
    await capture(page, 'drawer-tests', 'Opened Tests')
    await page.getByTestId('test-chip-select').selectOption('Not')
    await page.getByTestId('test-source-select').selectOption('hdl-from-nand')
    await page.getByTestId('run-test-button').click()
    await expect(page.getByTestId('test-summary')).toBeVisible()
    await capture(page, 'chip-test', 'Ran the Not test against the Not built from NAND')
    await page.click(UI_SELECTORS.rightBar.layersTrigger)
    await expect(page.locator(UI_SELECTORS.layersPanel)).toBeVisible()
    await capture(page, 'drawer-layers', 'Opened Layers')
    await page.click(UI_SELECTORS.rightBar.historyTrigger)
    await expect(page.locator(UI_SELECTORS.historyPanel)).toBeVisible()
    await capture(page, 'drawer-history', 'Opened History')
    await page.click(UI_SELECTORS.rightBar.closeDrawer)
    await page.click(UI_SELECTORS.helpBar.allShortcutsButton)
    await expect(page.locator(UI_SELECTORS.shortcutsModal)).toBeVisible()
    await capture(page, 'shortcuts', 'Opened All shortcuts from the help bar')
    await page.keyboard.press('Escape')
    await expect(page.locator(UI_SELECTORS.shortcutsModal)).toBeHidden()

    // Save, reload, load
    await page.getByTestId('right-bar-library-trigger').click()
    await page.getByTestId('library-name-input').fill(SAVED)
    await page.getByTestId('library-save').click()
    await expect(page.getByTestId(`library-entry-${SAVED}`)).toBeVisible()
    await capture(page, 'library-saved', `Opened Circuit Library, named the circuit "${SAVED}" and saved it`)
    await openApp(page, 'reload')
    await capture(page, 'after-reload', 'Reloaded the page')
    await closeDemo(page)
    await loadFromLibrary(page)
    await capture(page, 'library-loaded', `Opened Circuit Library and loaded "${SAVED}"`)

    // The same busy screen in light and in dark
    await page.click(UI_SELECTORS.rightBar.infoTrigger)
    await page.evaluate((id) => window.__CIRCUIT_ACTIONS__?.selectGate(id), ids.nand)
    await page.click(UI_SELECTORS.toolbar.propertiesToggle)
    await setTheme(page, 'light')
    await expect(page.locator('html')).not.toHaveClass(/\bdark\b/)
    await capture(page, 'theme-light', 'Chose Light in the theme menu, with Circuit Info and Properties open')
    await setTheme(page, 'dark')
    await expect(page.locator('html')).toHaveClass(/\bdark\b/)
    await capture(page, 'theme-dark', 'Chose Dark in the theme menu, same screen')

    // A phone, then the width WCAG 1.4.10 (Reflow) is defined at
    await setTheme(page, 'system')
    await page.setViewportSize({ width: 390, height: 844 })
    await openApp(page, 'reload')
    await capture(page, 'phone-390', 'Set the theme back to System and opened the app at 390 × 844 (a phone)')
    await closeDemo(page)
    await loadFromLibrary(page)
    await capture(page, 'phone-390-library', `Loaded "${SAVED}" from Circuit Library at 390 px`)
    await page.setViewportSize({ width: 320, height: 844 })
    await capture(page, 'reflow-320', 'Narrowed the window to 320 px, the WCAG 1.4.10 reflow width')
  })
})
