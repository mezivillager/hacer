import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import App from './App'
import { BootNotices } from '@/components/ui/BootNotices'
import { getBuiltinChipRegistry } from '@/core/chips/appRegistry'
import { restoreAutosave } from '@/store/actions/persistenceActions/autosave'

// Force singleton initialization on app boot so the builtin registry is
// populated before any component reads from it.
getBuiltinChipRegistry()

const bootNotices: (() => void)[] = []
if (import.meta.env.MODE !== 'test') restoreAutosave((show) => bootNotices.push(show))

// Note: StrictMode removed as it can cause double-renders with R3F
createRoot(document.getElementById('root')!).render(
  <>
    <App />
    <BootNotices notices={bootNotices} />
  </>,
)
