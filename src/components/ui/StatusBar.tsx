import { circuitActions, useCircuitStore } from '@/store/circuitStore'
import type { CircuitStore, StatusMessage } from '@/store/types'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { useHelpBarCollapsed } from './HelpBar/useHelpBarCollapsed'

const statusVariants = cva(
  'pointer-events-auto inline-flex items-center gap-3 px-4 py-1.5 rounded-full text-xs font-medium border shadow-md transition-all animate-in slide-in-from-bottom-2 duration-200',
  {
    variants: {
      severity: {
        info: 'bg-secondary text-secondary-foreground border-border',
        success: 'bg-primary/15 text-primary border-primary/30',
        warning: 'bg-[var(--warning)]/15 text-[var(--warning)] border-[var(--warning)]/30',
        error: 'bg-destructive/15 text-destructive border-destructive/30',
      },
    },
    defaultVariants: { severity: 'info' },
  },
)

export function StatusBar() {
  const messages = useCircuitStore((s: CircuitStore): StatusMessage[] => s.statusMessages)
  const [collapsed] = useHelpBarCollapsed()
  const latest = messages[messages.length - 1]

  if (!latest) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'absolute left-0 right-0 flex justify-center px-3 z-10 pointer-events-none',
        collapsed ? 'bottom-3' : 'bottom-9',
      )}
    >
      <button
        type="button"
        data-testid="status-bar"
        data-severity={latest.severity}
        onClick={(): void => {
          circuitActions.clearStatus(latest.id)
        }}
        className={statusVariants({ severity: latest.severity })}
      >
        <span data-testid="status-text">{latest.text}</span>
        <span aria-hidden className="text-[10px] opacity-60">
          click to dismiss
        </span>
      </button>
    </div>
  )
}
