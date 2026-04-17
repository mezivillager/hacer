import { useEffect } from 'react'
import { HelpCircle, ChevronUp, ChevronDown, Keyboard } from 'lucide-react'
import { Button } from '@/components/ui-kit/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui-kit/tooltip'
import { Kbd } from '@/components/ui-kit/kbd'
import { KeyboardShortcutsModal, MODAL_OPEN_EVENT } from '@/components/ui/KeyboardShortcutsModal'
import { useContextMode, type ContextMode } from './useContextMode'
import { useHelpBarCollapsed } from './useHelpBarCollapsed'

const contextualHints: Record<ContextMode, { keys: string[]; action: string }[]> = {
  default: [
    { keys: ['Click'], action: 'Select' },
    { keys: ['Drag'], action: 'Move camera' },
    { keys: ['Scroll'], action: 'Zoom' },
  ],
  selecting: [
    { keys: ['Delete'], action: 'Remove' },
    { keys: ['\u2190', '\u2192'], action: 'Rotate gate' },
    { keys: ['Esc'], action: 'Deselect' },
  ],
  wiring: [
    { keys: ['Click pin'], action: 'Connect' },
    { keys: ['Esc'], action: 'Cancel' },
  ],
  moving: [
    { keys: ['Click'], action: 'Place' },
    { keys: ['Esc'], action: 'Cancel' },
  ],
}

function dispatchOpenModal() {
  window.dispatchEvent(new CustomEvent(MODAL_OPEN_EVENT))
}

export function HelpBar() {
  const mode = useContextMode()
  const [collapsed, setCollapsed] = useHelpBarCollapsed()
  const hints = contextualHints[mode]

  // Global "?" key opens the modal (skip when typing into an input).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== '?') return
      const target = e.target as HTMLElement | null
      if (
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable
      ) {
        return
      }
      e.preventDefault()
      dispatchOpenModal()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  if (collapsed) {
    return (
      <>
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                data-testid="help-bar-expand-button"
                variant="secondary"
                size="sm"
                className="h-7 px-2 gap-1.5 shadow-md"
                onClick={() => setCollapsed(false)}
              >
                <ChevronUp className="w-3 h-3" />
                <Keyboard className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Show shortcuts</TooltipContent>
          </Tooltip>
        </div>
        <KeyboardShortcutsModal />
      </>
    )
  }

  return (
    <>
      <div
        data-testid="help-bar"
        className="absolute bottom-0 left-0 right-0 bg-card/90 backdrop-blur-sm border-t border-border z-10"
      >
        <div className="flex items-center justify-between px-3 py-1.5">
          {/* Left: collapse toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={() => setCollapsed(true)}
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Hide help bar</TooltipContent>
          </Tooltip>

          {/* Center: contextual hints */}
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
            {hints.map((hint, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <span className="flex items-center gap-0.5">
                  {hint.keys.map((k, ki) => (
                    <span key={ki} className="flex items-center">
                      {ki > 0 && <span className="text-muted-foreground/60 mx-0.5">+</span>}
                      <Kbd className="text-[10px] px-1.5 py-0.5 min-w-[20px] justify-center">
                        {k}
                      </Kbd>
                    </span>
                  ))}
                </span>
                <span>{hint.action}</span>
              </span>
            ))}
          </div>

          {/* Right: all shortcuts button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                data-testid="help-bar-all-shortcuts"
                variant="ghost"
                size="sm"
                className="h-6 px-2 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                onClick={dispatchOpenModal}
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

      <KeyboardShortcutsModal />
    </>
  )
}
