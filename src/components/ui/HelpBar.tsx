import { useState } from 'react'
import { Kbd } from './shadcn/kbd'
import { Button } from './shadcn/button'
import { Tooltip, TooltipContent, TooltipTrigger } from './shadcn/tooltip'
import { HelpCircle, ChevronUp, ChevronDown, Keyboard } from 'lucide-react'
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal'
import { useCircuitStore } from '@/store/circuitStore'

type ContextMode = 'default' | 'selecting' | 'wiring' | 'moving'

interface HelpBarProps {
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
}

// Contextual shortcuts based on current mode
const contextualShortcuts: Record<
  ContextMode,
  { keys: string[]; action: string }[]
> = {
  default: [
    { keys: ['Click'], action: 'Select' },
    { keys: ['Drag'], action: 'Move' },
    { keys: ['Scroll'], action: 'Zoom' },
  ],
  selecting: [
    { keys: ['Delete'], action: 'Remove' },
    { keys: ['R'], action: 'Rotate' },
    { keys: ['Ctrl', 'D'], action: 'Duplicate' },
  ],
  wiring: [
    { keys: ['Click pin'], action: 'Connect' },
    { keys: ['Esc'], action: 'Cancel' },
    { keys: ['Backspace'], action: 'Undo point' },
  ],
  moving: [
    { keys: ['Shift'], action: 'Snap to grid' },
    { keys: ['Esc'], action: 'Cancel' },
    { keys: ['Click'], action: 'Place' },
  ],
}

export function HelpBar({ collapsed = false, onCollapsedChange }: HelpBarProps) {
  const [shortcutsOpen, setShortcutsOpen] = useState(false)

  // Determine mode from store
  const placementMode = useCircuitStore((state) => state.placementMode)
  const wiringFrom = useCircuitStore((state) => state.wiringFrom)
  const selectedGateId = useCircuitStore((state) => state.selectedGateId)
  const selectedWireId = useCircuitStore((state) => state.selectedWireId)
  const selectedNodeId = useCircuitStore((state) => state.selectedNodeId)

  const mode: ContextMode = (() => {
    if (wiringFrom) return 'wiring'
    if (placementMode) return 'moving'
    if (selectedGateId || selectedWireId || selectedNodeId) return 'selecting'
    return 'default'
  })()

  const shortcuts = contextualShortcuts[mode]

  if (collapsed) {
    return (
      <>
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                size="sm"
                className="h-7 px-2 gap-1.5 shadow-md"
                onClick={() => onCollapsedChange?.(false)}
              >
                <ChevronUp className="w-3 h-3" />
                <Keyboard className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Show shortcuts</TooltipContent>
          </Tooltip>
        </div>
        <KeyboardShortcutsModal open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      </>
    )
  }

  return (
    <>
      <div className="absolute bottom-0 left-12 right-0 bg-card/90 backdrop-blur-sm border-t border-border">
        <div className="flex items-center justify-between px-3 py-1.5">
          {/* Left: Collapse toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={() => onCollapsedChange?.(true)}
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Hide help bar</TooltipContent>
          </Tooltip>

          {/* Center: Contextual shortcuts */}
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
            {shortcuts.map((shortcut, index) => (
              <ShortcutHint key={index} keys={shortcut.keys} action={shortcut.action} />
            ))}
          </div>

          {/* Right: Full shortcuts button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setShortcutsOpen(true)}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">All shortcuts</span>
                <Kbd className="text-[10px] hidden sm:inline-flex">?</Kbd>
              </Button>
            </TooltipTrigger>
            <TooltipContent>View all keyboard shortcuts</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <KeyboardShortcutsModal open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </>
  )
}

function ShortcutHint({ keys, action }: { keys: string[]; action: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="flex items-center gap-0.5">
        {keys.map((key, index) => (
          <span key={index} className="flex items-center">
            {index > 0 && <span className="text-muted-foreground/60 mx-0.5">+</span>}
            <Kbd className="text-[10px] px-1.5 py-0.5 min-w-[20px] justify-center">
              {key}
            </Kbd>
          </span>
        ))}
      </span>
      <span className="text-muted-foreground">{action}</span>
    </span>
  )
}
