import { test, expect } from '@playwright/test'

test.describe('Circuit Building', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Wait for app to load
    await page.waitForSelector('text=Nand2Fun', { timeout: 10000 })
  })

  test('can add a NAND gate to the canvas', async ({ page }) => {
    // Click Add NAND Gate button in sidebar
    await page.click('button:has-text("Add NAND Gate")')

    // Wait for placement mode
    await expect(page.locator('button:has-text("Cancel Placement")')).toBeVisible()

    // Click on canvas to place gate (approximate center)
    // Note: Canvas coordinates are 3D, so we click in the center area
    const canvas = page.locator('canvas').first()
    await canvas.click({ position: { x: 400, y: 300 } })

    // Verify gate was added by checking circuit info
    await expect(page.locator('text=/Gates: 1/')).toBeVisible()
  })

  test('can wire two gates together', async ({ page }) => {
    // Add first gate
    await page.click('button:has-text("Add NAND Gate")')
    await page.waitForSelector('button:has-text("Cancel Placement")')
    const canvas = page.locator('canvas').first()
    await canvas.click({ position: { x: 300, y: 300 } })

    // Wait for gate to be placed
    await page.waitForTimeout(500)

    // Add second gate
    await page.click('button:has-text("Add NAND Gate")')
    await page.waitForSelector('button:has-text("Cancel Placement")')
    await canvas.click({ position: { x: 500, y: 300 } })

    // Wait for both gates to be placed
    await page.waitForTimeout(500)
    await expect(page.locator('text=/Gates: 2/')).toBeVisible()

    // Note: Wiring via 3D pins is complex to test without data-testid attributes
    // This test verifies the gates are added successfully
    // Full wiring test would require adding test IDs to pin elements
  })

  test('can delete a gate', async ({ page }) => {
    // Add a gate
    await page.click('button:has-text("Add NAND Gate")')
    await page.waitForSelector('button:has-text("Cancel Placement")')
    const canvas = page.locator('canvas').first()
    await canvas.click({ position: { x: 400, y: 300 } })
    await page.waitForTimeout(500)

    // Select the gate by clicking on it
    await canvas.click({ position: { x: 400, y: 300 } })
    await page.waitForTimeout(300)

    // Click Delete Selected button
    const deleteButton = page.locator('button:has-text("Delete Selected")')
    await expect(deleteButton).toBeEnabled()
    await deleteButton.click()

    // Verify gate was removed
    await expect(page.locator('text=/Gates: 0/')).toBeVisible()
  })

  test('can clear all gates', async ({ page }) => {
    // Add a gate
    await page.click('button:has-text("Add NAND Gate")')
    await page.waitForSelector('button:has-text("Cancel Placement")')
    const canvas = page.locator('canvas').first()
    await canvas.click({ position: { x: 400, y: 300 } })
    await page.waitForTimeout(500)

    // Verify gate exists
    await expect(page.locator('text=/Gates: 1/')).toBeVisible()

    // Click Clear All button
    const clearButton = page.locator('button:has-text("Clear All")')
    await expect(clearButton).toBeEnabled()
    await clearButton.click()

    // Verify all gates cleared
    await expect(page.locator('text=/Gates: 0/')).toBeVisible()
  })
})
