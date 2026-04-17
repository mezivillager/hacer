/**
 * Toolbar / Drawer Action Helpers
 *
 * Reusable actions for the new shadcn-based shell. Most operations
 * require opening a popover or drawer first before targeting an inner
 * control \u2014 these helpers encapsulate that.
 */

import type { Page } from '@playwright/test'
import { UI_SELECTORS } from '../../selectors/ui.selectors'
import type { GateType } from '@/store/types'

export async function selectGateViaToolbar(page: Page, gateType: GateType): Promise<void> {
  await page.click(UI_SELECTORS.toolbar.gatesTrigger)
  await page.waitForSelector(UI_SELECTORS.gatesPopover.root, { state: 'visible' })
  await page.click(UI_SELECTORS.gatesPopover.getGate(gateType))
  // Popover auto-closes on click; wait for it
  await page.waitForSelector(UI_SELECTORS.gatesPopover.root, { state: 'hidden' })
}

export async function selectIoViaToolbar(
  page: Page,
  kind: 'input' | 'output' | 'junction',
): Promise<void> {
  await page.click(UI_SELECTORS.toolbar.ioTrigger)
  await page.waitForSelector(UI_SELECTORS.ioPopover.root, { state: 'visible' })
  await page.click(UI_SELECTORS.ioPopover[kind])
  await page.waitForSelector(UI_SELECTORS.ioPopover.root, { state: 'hidden' })
}

export async function openInfoDrawer(page: Page): Promise<void> {
  await page.click(UI_SELECTORS.rightBar.infoTrigger)
  await page.waitForSelector(UI_SELECTORS.infoPanel.root, { state: 'visible' })
}

export async function closeInfoDrawer(page: Page): Promise<void> {
  await page.click(UI_SELECTORS.rightBar.closeDrawer)
  await page.waitForSelector(UI_SELECTORS.infoPanel.root, { state: 'hidden' })
}

export async function setThemeViaToolbar(
  page: Page,
  theme: 'light' | 'dark' | 'system',
): Promise<void> {
  await page.click(UI_SELECTORS.toolbar.themeTrigger)
  await page.click(UI_SELECTORS.toolbar.themeOption(theme))
}

export async function clickToolbarSimToggle(page: Page): Promise<void> {
  await page.click(UI_SELECTORS.toolbar.simToggle)
}

export async function clickToolbarClearAll(page: Page): Promise<void> {
  await page.click(UI_SELECTORS.toolbar.clearAll)
}

export async function clickToolbarDeleteSelected(page: Page): Promise<void> {
  await page.click(UI_SELECTORS.toolbar.deleteSelected)
}
