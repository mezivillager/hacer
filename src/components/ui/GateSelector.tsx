import { Tooltip, TooltipTrigger, TooltipContent } from './shadcn'
import { useCircuitStore } from '@/store/circuitStore'
import type { GateType } from '@/store/types'
import { getGateIcon } from '@/gates/icons'
import { colors } from '@/theme'
import { cn } from '@lib/utils'
import { handleGateSelect } from './handlers/uiHandlers'

// Elementary gates to show in the selector
const ELEMENTARY_GATES: GateType[] = ['NAND', 'AND', 'OR', 'NOT', 'XOR']

// Gate descriptions for tooltips
const gateDescriptions: Record<GateType, string> = {
  NAND: 'NAND Gate - Output is LOW only when both inputs are HIGH',
  AND: 'AND Gate - Output is HIGH only when both inputs are HIGH',
  OR: 'OR Gate - Output is HIGH when at least one input is HIGH',
  NOT: 'NOT Gate (Inverter) - Output is the inverse of the input',
  NOR: 'NOR Gate - Output is HIGH only when both inputs are LOW',
  XOR: 'XOR Gate - Output is HIGH when inputs are different',
  XNOR: 'XNOR Gate - Output is HIGH when inputs are the same',
}

export function GateSelector() {
  // Use selectors for granular subscriptions
  const placementMode = useCircuitStore((s) => s.placementMode)
  const startPlacement = useCircuitStore((s) => s.startPlacement)
  const cancelPlacement = useCircuitStore((s) => s.cancelPlacement)

  return (
    <div className="grid grid-cols-2 gap-2 mb-2">
      {ELEMENTARY_GATES.map(type => {
        const IconComponent = getGateIcon(type)
        const isActive = placementMode === type

        return (
          <Tooltip key={type}>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  'gate-icon flex flex-col items-center justify-center p-3 rounded-lg bg-white/5 border border-border cursor-pointer transition-all select-none hover:bg-primary/10 hover:border-primary hover:-translate-y-px active:translate-y-0',
                  isActive && 'active bg-primary/20 border-primary shadow-[0_0_12px_rgba(74,158,255,0.3)]',
                )}
                data-gate-type={type}
                onClick={() => handleGateSelect(type, placementMode, startPlacement, cancelPlacement)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleGateSelect(type, placementMode, startPlacement, cancelPlacement)
                  }
                }}
              >
                <IconComponent size={36} color={isActive ? colors.primary : colors.text.secondary} />
                <span className={cn(
                  'mt-1.5 text-[11px] font-medium text-white/65 uppercase tracking-wider',
                  isActive && 'text-primary',
                )}>
                  {type}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">{gateDescriptions[type]}</TooltipContent>
          </Tooltip>
        )
      })}
    </div>
  )
}
