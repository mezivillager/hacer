import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// Note: StrictMode removed as it can cause double-renders with R3F
createRoot(document.getElementById('root')!).render(<App />)
