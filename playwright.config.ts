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
  workers: process.env.CI ? 4 : undefined,
  reporter: 'html',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    viewport: { width: 1280, height: 720 },
    // Enable WebGL support for 3D canvas testing
    launchOptions: {
      args: [
        '--use-gl=desktop',
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
