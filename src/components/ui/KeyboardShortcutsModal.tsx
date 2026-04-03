import { useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './shadcn/dialog'
import { Kbd } from './shadcn/kbd'
import { ScrollArea } from './shadcn/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './shadcn/tabs'

interface KeyboardShortcutsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface Shortcut {
  keys: string[]
  description: string
}

interface ShortcutCategory {
  name: string
  shortcuts: Shortcut[]
}

const shortcutCategories: ShortcutCategory[] = [
  {
    name: 'Navigation',
    shortcuts: [
      { keys: ['Scroll'], description: 'Zoom in/out' },
      { keys: ['Middle drag'], description: 'Pan view' },
      { keys: ['Space', 'Drag'], description: 'Pan view (alternative)' },
      { keys: ['Home'], description: 'Reset view' },
      { keys: ['F'], description: 'Fit all to view' },
    ],
  },
  {
    name: 'Selection',
    shortcuts: [
      { keys: ['Click'], description: 'Select gate/wire' },
      { keys: ['Shift', 'Click'], description: 'Add to selection' },
      { keys: ['Ctrl/Cmd', 'A'], description: 'Select all' },
      { keys: ['Esc'], description: 'Deselect all' },
    ],
  },
  {
    name: 'Editing',
    shortcuts: [
      { keys: ['Delete'], description: 'Remove selected' },
      { keys: ['Backspace'], description: 'Remove selected (alt)' },
      { keys: ['Ctrl/Cmd', 'D'], description: 'Duplicate selected' },
      { keys: ['Ctrl/Cmd', 'Z'], description: 'Undo' },
      { keys: ['Ctrl/Cmd', 'Shift', 'Z'], description: 'Redo' },
      { keys: ['Ctrl/Cmd', 'C'], description: 'Copy' },
      { keys: ['Ctrl/Cmd', 'V'], description: 'Paste' },
    ],
  },
  {
    name: 'Gates & Wiring',
    shortcuts: [
      { keys: ['Click pin'], description: 'Start/end wire' },
      { keys: ['Shift', 'Click input'], description: 'Toggle input value' },
      { keys: ['Left/Right'], description: 'Rotate gate 90deg' },
      { keys: ['R'], description: 'Rotate gate (quick)' },
      { keys: ['Drag body'], description: 'Move gate' },
    ],
  },
  {
    name: 'Simulation',
    shortcuts: [
      { keys: ['Space'], description: 'Run/pause simulation' },
      { keys: ['S'], description: 'Step simulation' },
      { keys: ['Ctrl/Cmd', 'R'], description: 'Reset simulation' },
    ],
  },
  {
    name: 'View',
    shortcuts: [
      { keys: ['G'], description: 'Toggle grid' },
      { keys: ['X'], description: 'Toggle axes' },
      { keys: ['Tab'], description: 'Toggle sidebar' },
      { keys: ['?'], description: 'Show shortcuts' },
    ],
  },
]

export function KeyboardShortcutsModal({
  open,
  onOpenChange,
}: KeyboardShortcutsModalProps) {
  // Global keyboard listener for ? key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        onOpenChange(!open)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Keyboard Shortcuts
            <Kbd className="ml-2 text-xs">?</Kbd>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Complete list of keyboard shortcuts for the circuit designer
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="w-full justify-start flex-wrap h-auto gap-1 bg-transparent p-0 mb-4">
            <TabsTrigger
              value="all"
              className="data-[state=active]:bg-secondary text-xs h-7"
            >
              All
            </TabsTrigger>
            {shortcutCategories.map((category) => (
              <TabsTrigger
                key={category.name}
                value={category.name.toLowerCase()}
                className="data-[state=active]:bg-secondary text-xs h-7"
              >
                {category.name}
              </TabsTrigger>
            ))}
          </TabsList>

          <ScrollArea className="h-[50vh] pr-4">
            <TabsContent value="all" className="mt-0 space-y-6">
              {shortcutCategories.map((category) => (
                <ShortcutSection key={category.name} category={category} />
              ))}
            </TabsContent>

            {shortcutCategories.map((category) => (
              <TabsContent
                key={category.name}
                value={category.name.toLowerCase()}
                className="mt-0"
              >
                <ShortcutSection category={category} showTitle={false} />
              </TabsContent>
            ))}
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

function ShortcutSection({
  category,
  showTitle = true,
}: {
  category: ShortcutCategory
  showTitle?: boolean
}) {
  return (
    <div>
      {showTitle && (
        <h3 className="text-sm font-medium text-foreground mb-3">{category.name}</h3>
      )}
      <div className="grid gap-2">
        {category.shortcuts.map((shortcut, index) => (
          <div
            key={index}
            className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors"
          >
            <span className="text-sm text-muted-foreground">{shortcut.description}</span>
            <div className="flex items-center gap-1">
              {shortcut.keys.map((key, keyIndex) => (
                <span key={keyIndex} className="flex items-center gap-1">
                  {keyIndex > 0 && (
                    <span className="text-muted-foreground text-xs">+</span>
                  )}
                  <Kbd className="text-[11px] min-w-[24px] justify-center">{key}</Kbd>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
