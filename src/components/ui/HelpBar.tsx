import { useState } from 'react'
import { HelpCircle, ChevronUp, ChevronDown, Keyboard } from 'lucide-react'
import {
  Button,
  Kbd,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from './shadcn'
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal'
import { useCircuitStore } from '@/store/circuitStore'

type ContextMode = 'default' | 'selecting' | 'wiring' | 'placing'

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
    { keys: ['←/→'], action: 'Rotate' },
    { keys: ['Esc'], action: 'Deselect' },
  ],
  wiring: [
    { keys: ['Click pin'], action: 'Connect' },
    { keys: ['Esc'], action: 'Cancel' },
  ],
  placing: [
    { keys: ['Click'], action: 'Place' },
    { keys: ['Esc'], action: 'Cancel' },
  ],
}

function useContextMode(): ContextMode {
  const placementMode = useCircuitStore((s) => s.placementMode)
  const nodePlacementMode = useCircuitStore((s) => s.nodePlacementMode)
  const junctionPlacementMode = useCircuitStore((s) => s.junctionPlacementMode)
  const wiringFrom = useCircuitStore((s) => s.wiringFrom)
  const selectedGateId = useCircuitStore((s) => s.selectedGateId)
  const selectedWireId = useCircuitStore((s) => s.selectedWireId)
  const selectedNodeId = useCircuitStore((s) => s.selectedNodeId)

  if (placementMode || nodePlacementMode || junctionPlacementMode) return 'placing'
  if (wiringFrom) return 'wiring'
  if (selectedGateId || selectedWireId || selectedNodeId) return 'selecting'
  return 'default'
}

export function HelpBar() {
  const [collapsed, setCollapsed] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const mode = useContextMode()
  const shortcuts = contextualShortcuts[mode]

  if (collapsed) {
    return (
      <>
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                size="sm"
                className="h-7 px-2 gap-1.5 shadow-md"
                onClick={() => setCollapsed(false)}
                data-testid="helpbar-expand"
              >
                <ChevronUp className="w-3 h-3" />
                <Keyboard className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Show shortcuts</TooltipContent>
          </Tooltip>
        </div>
        <KeyboardShortcutsModal
          open={shortcutsOpen}
          onOpenChange={setShortcutsOpen}
        />
      </>
    )
  }

  return (
    <>
      <div
        className="absolute bottom-0 left-12 right-0 bg-card/90 backdrop-blur-sm border-t border-border z-10"
        data-testid="helpbar"
      >
        <div className="flex items-center justify-between px-3 py-1.5">
          {/* Left: Collapse toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={() => setCollapsed(true)}
                data-testid="helpbar-collapse"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Hide help bar</TooltipContent>
          </Tooltip>

          {/* Center: Contextual shortcuts */}
          <div
            className="flex items-center justify-center gap-4 text-xs text-muted-foreground"
            data-testid="helpbar-shortcuts"
          >
            {shortcuts.map((shortcut, index) => (
              <ShortcutHint
                key={index}
                keys={shortcut.keys}
                action={shortcut.action}
              />
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
                data-testid="helpbar-all-shortcuts"
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

      <KeyboardShortcutsModal
        open={shortcutsOpen}
        onOpenChange={setShortcutsOpen}
      />
    </>
  )
}

function ShortcutHint({ keys, action }: { keys: string[]; action: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="flex items-center gap-0.5">
        {keys.map((key, index) => (
          <span key={index} className="flex items-center">
            {index > 0 && (
              <span className="text-muted-foreground/60 mx-0.5">+</span>
            )}
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
