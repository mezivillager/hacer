import { circuitActions, useCircuitStore } from '@/store/circuitStore'
import styles from './StatusBar.module.css'

export function StatusBar() {
  const messages = useCircuitStore((state) => state.statusMessages)
  const latest = messages[messages.length - 1]

  if (!latest) {
    return null
  }

  return (
    <div role="status" aria-live="polite" className={styles.wrapper}>
      <button
        type="button"
        data-testid="status-bar"
        data-severity={latest.severity}
        onClick={() => circuitActions.clearStatus(latest.id)}
        className={`${styles.statusBar} ${styles[latest.severity]}`}
      >
        <span data-testid="status-text">{latest.text}</span>
        <span aria-hidden className={styles.dismissText}>
          click to dismiss
        </span>
      </button>
    </div>
  )
}
