import { CanvasArea } from '@/components/canvas/CanvasArea'
import { StatusBar } from '@/components/ui/StatusBar'

// Phase A scaffold: bare layout. Replaced by themed shell in Phase B onward.
// Note: globals.css/index.css is imported once in main.tsx, not here.
function App() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <CanvasArea />
      <StatusBar />
    </div>
  )
}

export default App
