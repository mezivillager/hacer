import { Layout } from 'antd'
import { ThemeProvider } from './theme'
import { Sidebar } from './components/ui/Sidebar'
import { CanvasArea } from './components/canvas/CanvasArea'
import { DemoOverlay } from './components/ui/DemoOverlay'
import { StatusBar } from './components/ui/StatusBar'
import { Toaster } from './components/ui/shadcn/sonner'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import './App.css'

function AppContent() {
  useKeyboardShortcuts()

  return (
    <Layout className="app-layout">
      <Sidebar />
      <CanvasArea />
      <DemoOverlay />
      <StatusBar />
    </Layout>
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
