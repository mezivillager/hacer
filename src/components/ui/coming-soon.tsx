import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui-kit/tooltip'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Wraps a stub control with a "Coming soon" tooltip.
 *
 * The shadcn `<Button>` primitive sets `disabled:pointer-events-none` and
 * disabled native buttons aren't in the tab order, so a `<TooltipTrigger
 * asChild>` placed directly on a disabled control gets no hover or focus
 * events and the tooltip never opens. To keep the disabled control
 * disabled while still surfacing the tooltip, ComingSoon wraps the child
 * in a focusable `<span>` that owns the hover/focus contract. The span
 * also carries `cursor-not-allowed` so the disabled affordance is
 * unambiguous on `variant="ghost"` controls, where `disabled:opacity-50`
 * alone reads as merely faded against a transparent background.
 *
 * Layout consumers that need the focusable wrapper to fill its parent
 * (e.g. `w-full` Quick Action buttons) pass `triggerClassName="block w-full"`.
 */
export function ComingSoon({
  children,
  label = 'Coming soon',
  triggerClassName,
}: {
  children: ReactNode
  label?: string
  /** Extra classes for the focusable wrapper. Use `block w-full` when the
   *  wrapped control must fill its parent width. */
  triggerClassName?: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          data-testid="coming-soon-trigger"
          tabIndex={0}
          className={cn(
            'inline-flex cursor-not-allowed rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
            triggerClassName,
          )}
        >
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
