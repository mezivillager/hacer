import type { ReactNode } from 'react'
import { render } from '@testing-library/react'
import { ThemeProvider } from '@/components/ui-kit/theme-provider'
import { TooltipProvider } from '@/components/ui-kit/tooltip'
import { Shell } from '@/components/Shell'

/**
 * Render the full non-3D DOM shell (no R3F Canvas) with the app's provider stack, against the
 * real Zustand store. The harness for cross-panel RTL **integration** tests of non-3D UX —
 * the mid level between an isolated component test and a full-browser Playwright spec.
 *
 * Pass `scene` to inject a stub into the canvas region; omit it to render no scene at all.
 */
export function renderShell(options?: { scene?: ReactNode }) {
  return render(
    <ThemeProvider>
      <TooltipProvider>
        <Shell scene={options?.scene ?? null} />
      </TooltipProvider>
    </ThemeProvider>,
  )
}
