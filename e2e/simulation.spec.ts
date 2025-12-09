import { test, expect } from '@playwright/test'

test.describe('Simulation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('text=Nand2Fun', { timeout: 10000 })
  })

  test('can start and stop simulation', async ({ page }) => {
    // Add a gate first
    await page.click('button:has-text("Add NAND Gate")')
    await page.waitForSelector('button:has-text("Cancel Placement")')
    const canvas = page.locator('canvas').first()
    await canvas.click({ position: { x: 400, y: 300 } })
    await page.waitForTimeout(500)

    // Click Run Simulation button
    const runButton = page.locator('button:has-text("Run Simulation")')
    await runButton.click()

    // Verify button text changed to Pause
    await expect(page.locator('button:has-text("Pause Simulation")')).toBeVisible()

    // Verify status shows Running
    await expect(page.locator('text=/Status:.*Running/')).toBeVisible()

    // Click Pause Simulation
    await page.click('button:has-text("Pause Simulation")')

    // Verify button text changed back
    await expect(page.locator('button:has-text("Run Simulation")')).toBeVisible()

    // Verify status shows Paused
    await expect(page.locator('text=/Status:.*Paused/')).toBeVisible()
  })

  test('simulation status updates correctly', async ({ page }) => {
    // Initially should show Paused
    await expect(page.locator('text=/Status:.*Paused/')).toBeVisible()

    // Start simulation
    await page.click('button:has-text("Run Simulation")')
    await expect(page.locator('text=/Status:.*Running/')).toBeVisible()

    // Stop simulation
    await page.click('button:has-text("Pause Simulation")')
    await expect(page.locator('text=/Status:.*Paused/')).toBeVisible()
  })

  // Note: Testing signal propagation through wires requires:
  // 1. Adding test IDs to pin elements
  // 2. Testing input toggling (Shift+click)
  // 3. Verifying output pin state changes
  // This would be a more complex E2E test that requires UI enhancements
})
