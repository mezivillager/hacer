import { useEffect } from 'react'
import { HelpCircle, ChevronUp, ChevronDown, Keyboard } from 'lucide-react'
import { Button } from '@/components/ui-kit/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui-kit/tooltip'
import { Kbd } from '@/components/ui-kit/kbd'
import { KeyboardShortcutsModal, MODAL_OPEN_EVENT } from '@/components/ui/KeyboardShortcutsModal'
import { useHelpText } from './useHelpText'
import { useHelpBarCollapsed } from './useHelpBarCollapsed'

function dispatchOpenModal() {
  window.dispatchEvent(new CustomEvent(MODAL_OPEN_EVENT))
}

export function HelpBar() {
  const helpText = useHelpText()
  const [collapsed, setCollapsed] = useHelpBarCollapsed()

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
        <div className="flex items-center justify-between gap-3 px-3 py-1.5">
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

          {/* Center: contextual help text (matches the original CanvasArea
              help-overlay copy; updates with placement / wiring / selection
              state via useHelpText). */}
          <p
            data-testid="help-bar-text"
            className="flex-1 text-center text-xs text-muted-foreground truncate"
          >
            {helpText}
          </p>

          {/* Right: all shortcuts button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                data-testid="help-bar-all-shortcuts"
                variant="ghost"
                size="sm"
                className="h-6 px-2 gap-1.5 text-xs text-muted-foreground hover:text-foreground shrink-0"
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
