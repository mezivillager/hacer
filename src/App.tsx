import { Layout } from 'antd'
import { ThemeProvider } from './theme'
import { Sidebar } from './components/ui/Sidebar'
import { CanvasArea } from './components/canvas/CanvasArea'
import { DemoOverlay } from './components/ui/DemoOverlay'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import './App.css'

function AppContent() {
  useKeyboardShortcuts()

  return (
    <Layout className="app-layout">
      <Sidebar />
      <CanvasArea />
      <DemoOverlay />
    </Layout>
  )
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  )
}

export default App
