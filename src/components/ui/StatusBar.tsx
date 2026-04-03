import { circuitActions, useCircuitStore } from '@/store/circuitStore'
import type { CircuitStore } from '@/store/types'
import type { StatusMessage } from '@/store/types'
import { cn } from '@lib/utils'

const severityClasses = {
  info: 'bg-blue-600 hover:bg-blue-700',
  warning: 'bg-yellow-600 hover:bg-yellow-700',
  error: 'bg-red-600 hover:bg-red-700',
} as const

export function StatusBar() {
  const messages = useCircuitStore((state: CircuitStore): StatusMessage[] => state.statusMessages)
  const latest = messages[messages.length - 1]

  if (!latest) {
    return null
  }

  return (
    <div role="status" aria-live="polite" className="fixed left-0 right-0 bottom-0 z-[1000]">
      <button
        type="button"
        data-testid="status-bar"
        data-severity={latest.severity}
        onClick={(): void => { circuitActions.clearStatus(latest.id) }}
        className={cn(
          'flex justify-between items-center w-full px-3 py-1.5 text-white cursor-pointer border-none outline-transparent font-inherit text-inherit text-left transition-colors duration-200',
          'focus-visible:shadow-[0_0_0_2px_rgba(255,255,255,0.8)_inset] focus-visible:outline-2 focus-visible:outline-transparent',
          severityClasses[latest.severity],
        )}
      >
        <span data-testid="status-text">{latest.text}</span>
        <span aria-hidden className="opacity-80 text-[0.9em]">
          click to dismiss
        </span>
      </button>
    </div>
  )
}
