import { ThemeProvider } from '@/components/ui-kit/theme-provider'
import { TooltipProvider } from '@/components/ui-kit/tooltip'
import { Toaster } from 'sonner'
import { CanvasArea } from '@/components/canvas/CanvasArea'
import { Shell } from '@/components/Shell'
import { useCircuitStore } from '@/store/circuitStore'

// Icon column: w-8 (32px) + px-1.5*2 (12px) + 1px border ≈ 44px. Use 60px for a clear gap.
const ICON_COL_OFFSET = '60px'
// Icon column + open drawer (280px PANEL_WIDTH) + same 16px gap = 356px → round to 360px.
const DRAWER_OPEN_OFFSET = '360px'

function App() {
  const rightPanelOpen = useCircuitStore((s) => s.rightPanelOpen)

  return (
    <ThemeProvider>
      <TooltipProvider>
        <Shell scene={<CanvasArea />} />
        {/*
         * offset.right reactively clears both RightActionBar states (B-002):
         *  - Closed: 60 px clears the ~44 px icon column with a comfortable gap.
         *  - Open:  360 px clears the icon column (44 px) + 280 px drawer + gap.
         * rightPanelOpen is kept in the store by RightActionBar via setRightPanelOpen.
         */}
        <Toaster
          position="top-right"
          richColors
          closeButton
          offset={{ right: rightPanelOpen ? DRAWER_OPEN_OFFSET : ICON_COL_OFFSET }}
        />
      </TooltipProvider>
    </ThemeProvider>
  )
}

export default App
