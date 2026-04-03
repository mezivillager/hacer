import { ThemeProvider } from './theme'
import { CompactToolbar } from './components/ui/CompactToolbar'
import { CanvasArea } from './components/canvas/CanvasArea'
import { DemoOverlay } from './components/ui/DemoOverlay'
import { StatusBar } from './components/ui/StatusBar'
import { Toaster } from './components/ui/shadcn/sonner'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import './App.css'

function AppContent() {
  useKeyboardShortcuts()

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <CompactToolbar />
      <div className="flex-1 relative">
        <CanvasArea />
        <DemoOverlay />
        <StatusBar />
      </div>
    </div>
  )
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
      <Toaster />
    </ThemeProvider>
  )
}

export default App
