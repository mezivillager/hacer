import { useState } from 'react'
import { ThemeProvider } from './theme'
import { CompactToolbar } from './components/ui/CompactToolbar'
import { CanvasArea } from './components/canvas/CanvasArea'
import { DemoOverlay } from './components/ui/DemoOverlay'
import { StatusBar } from './components/ui/StatusBar'
import { PropertiesPanel } from './components/ui/PropertiesPanel'
import { RightActionBar } from './components/ui/RightActionBar'
import { HelpBar } from './components/ui/HelpBar'
import { Toaster } from './components/ui/shadcn/sonner'
import { TooltipProvider } from './components/ui/shadcn/tooltip'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import './App.css'

function AppContent() {
  useKeyboardShortcuts()
  const [helpBarCollapsed, setHelpBarCollapsed] = useState(false)

  return (
    <TooltipProvider>
      <div className="flex h-screen w-full bg-background overflow-hidden">
        <CompactToolbar />
        <div className="flex-1 relative">
          <CanvasArea />
          <DemoOverlay />
          <StatusBar />
          <PropertiesPanel />
          <RightActionBar />
          <HelpBar collapsed={helpBarCollapsed} onCollapsedChange={setHelpBarCollapsed} />
        </div>
      </div>
    </TooltipProvider>
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
