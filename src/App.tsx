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
        <Toaster position="top-right" richColors closeButton />
      </TooltipProvider>
    </ThemeProvider>
  )
}

export default App
