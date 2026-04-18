import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui-kit/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui-kit/tabs'
import { ScrollArea } from '@/components/ui-kit/scroll-area'
import { Kbd } from '@/components/ui-kit/kbd'
import { SHORTCUT_GROUPS, type ShortcutGroup } from './catalog'

/**
 * Custom event used to open the modal from anywhere (e.g. global "?" key
 * binding installed by HelpBar). Decouples HelpBar from
 * KeyboardShortcutsModal mounting.
 */
export const MODAL_OPEN_EVENT = 'hacer-open-shortcuts-modal'

export function KeyboardShortcutsModal() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handler = () => setOpen(true)
    window.addEventListener(MODAL_OPEN_EVENT, handler)
    return () => window.removeEventListener(MODAL_OPEN_EVENT, handler)
  }, [])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        data-testid="shortcuts-modal"
        className="max-w-2xl max-h-[80vh]"
      >
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
            {SHORTCUT_GROUPS.map((group) => (
              <TabsTrigger
                key={group.name}
                value={group.name.toLowerCase()}
                className="data-[state=active]:bg-secondary text-xs h-7"
              >
                {group.name}
              </TabsTrigger>
            ))}
          </TabsList>

          <ScrollArea className="h-[50vh] pr-4">
            <TabsContent value="all" className="mt-0 space-y-6">
              {SHORTCUT_GROUPS.map((group) => (
                <ShortcutSection key={group.name} group={group} />
              ))}
            </TabsContent>

            {SHORTCUT_GROUPS.map((group) => (
              <TabsContent
                key={group.name}
                value={group.name.toLowerCase()}
                className="mt-0"
              >
                <ShortcutSection group={group} showTitle={false} />
              </TabsContent>
            ))}
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

function ShortcutSection({
  group,
  showTitle = true,
}: {
  group: ShortcutGroup
  showTitle?: boolean
}) {
  return (
    <div data-testid={`shortcuts-tab-${group.name}`}>
      {showTitle && (
        <h3 className="text-sm font-medium text-foreground mb-3">{group.name}</h3>
      )}
      <div className="grid gap-2">
        {group.shortcuts.map((s, i) => (
          <div
            key={`${group.name}-${i}`}
            className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors"
          >
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              {s.description}
              {s.comingSoon && (
                <span className="text-[10px] uppercase text-muted-foreground/60 font-medium tracking-wider">
                  coming soon
                </span>
              )}
            </span>
            <div className="flex items-center gap-1">
              {s.keys.map((k, ki) => (
                <span key={ki} className="flex items-center gap-1">
                  {ki > 0 && <span className="text-muted-foreground text-xs">+</span>}
                  <Kbd className="text-[11px] min-w-[24px] justify-center">{k}</Kbd>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
