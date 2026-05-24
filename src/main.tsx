import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import App from './App'
import { getBuiltinChipRegistry } from '@/core/chips/appRegistry'

// Force singleton initialization on app boot so the builtin registry is
// populated before any component reads from it.
getBuiltinChipRegistry()

// Note: StrictMode removed as it can cause double-renders with R3F
createRoot(document.getElementById('root')!).render(<App />)
