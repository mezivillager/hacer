import { ThemeProvider } from '@/components/ui-kit/theme-provider'
import { Toaster } from 'sonner'
import { CanvasArea } from '@/components/canvas/CanvasArea'
import { StatusBar } from '@/components/ui/StatusBar'

// Phase B scaffold: themed shell, Sonner mounted. Shell components land in Phase C.
function App() {
  return (
    <ThemeProvider>
      <div className="flex flex-col h-screen w-screen overflow-hidden bg-background text-foreground">
        <CanvasArea />
        <StatusBar />
      </div>
      <Toaster position="top-right" richColors closeButton />
    </ThemeProvider>
  )
}

export default App
