import { ThemeProvider } from '@/components/ui-kit/theme-provider'
import { TooltipProvider } from '@/components/ui-kit/tooltip'
import { Toaster } from 'sonner'
import { CanvasArea } from '@/components/canvas/CanvasArea'
import { Shell } from '@/components/Shell'

function App() {
  return (
    <ThemeProvider>
      <TooltipProvider>
        <Shell scene={<CanvasArea />} />
        {/*
         * offset.right must clear the always-visible icon column (~44 px wide: w-8 + px-1.5 padding
         * on each side + border). 60 px gives a comfortable 16 px gap. When the 280 px drawer is
         * open the toast will still sit 16 px to its left; the drawer shifts the toaster further
         * right automatically because the bar is absolutely-positioned from the viewport edge and
         * the toast inset is relative to that same edge — so open-drawer overlap is also prevented.
         */}
        <Toaster position="top-right" richColors closeButton offset={{ right: '60px' }} />
      </TooltipProvider>
    </ThemeProvider>
  )
}

export default App
