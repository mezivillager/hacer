import { ThemeProvider } from '@/components/ui-kit/theme-provider'
import { TooltipProvider } from '@/components/ui-kit/tooltip'
import { Toaster } from 'sonner'
import { CanvasArea } from '@/components/canvas/CanvasArea'
import { StatusBar } from '@/components/ui/StatusBar'
import { CompactToolbar } from '@/components/ui/CompactToolbar'
import { RightActionBar } from '@/components/ui/RightActionBar'
import { PropertiesPanel } from '@/components/ui/PropertiesPanel'
import { HelpBar } from '@/components/ui/HelpBar'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'

function AppContent() {
  // Restore the global keyboard shortcut handler (was lost during the
  // Phase A scaffold rewrite; HelpBar adds the "?"-opens-modal binding
  // separately).
  useKeyboardShortcuts()
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      <CompactToolbar />
      <div className="flex-1 relative">
        <CanvasArea />
        <RightActionBar />
        <PropertiesPanel />
        <HelpBar />
      </div>
    </div>
  )
}

function App() {
  return (
    <ThemeProvider>
      <TooltipProvider>
        <AppContent />
        <StatusBar />
        <Toaster position="top-right" richColors closeButton />
      </TooltipProvider>
    </ThemeProvider>
  )
}

export default App
