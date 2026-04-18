import { defineConfig, devices } from '@playwright/test'

// Avoid Node warning: NO_COLOR ignored when FORCE_COLOR is set
if (process.env.FORCE_COLOR && process.env.NO_COLOR) {
  delete process.env.NO_COLOR
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: false, // Temporarily disabled for debugging
  retries: process.env.CI ? 2 : 0,
  // @ui specs share a worker-scoped browser context for R3F scene
  // initialization speed; running them across multiple workers locally
  // surfaces a pre-existing test-isolation flake. Fixed worker count
  // keeps the suite deterministic. CI uses 2 workers as a balance of
  // speed and isolation.
  workers: process.env.CI ? 2 : 1,
  reporter: 'html',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    viewport: { width: 1280, height: 720 },
    // Enable WebGL support for 3D canvas testing.
    // --use-gl=desktop fails in headless Chromium on this environment
    // ("BindToCurrentSequence failed"); fall back to ANGLE+SwiftShader,
    // which is software-rendered but reliable across machines.
    launchOptions: {
      args: [
        '--use-angle=swiftshader',
        '--enable-unsafe-swiftshader',
        '--enable-webgl',
        '--ignore-gpu-blocklist',
      ],
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120 * 1000,
  },
})
