import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui-kit/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui-kit/tabs'
import { Kbd } from '@/components/ui-kit/kbd'
import { cn } from '@/lib/utils'
import { SHORTCUT_GROUPS } from './catalog'

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
        className="max-w-lg"
      >
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue={SHORTCUT_GROUPS[0].name} className="mt-2">
          <TabsList className="grid w-full grid-cols-4">
            {SHORTCUT_GROUPS.map((group) => (
              <TabsTrigger key={group.name} value={group.name} className="text-xs">
                {group.name}
              </TabsTrigger>
            ))}
          </TabsList>
          {SHORTCUT_GROUPS.map((group) => (
            <TabsContent
              key={group.name}
              value={group.name}
              data-testid={`shortcuts-tab-${group.name}`}
              className="mt-3 space-y-1.5"
            >
              {group.shortcuts.map((s, i) => (
                <div
                  key={`${group.name}-${i}`}
                  className={cn(
                    'flex items-center justify-between px-2 py-1.5 rounded-md',
                    s.comingSoon ? 'opacity-50' : 'hover:bg-secondary/50',
                  )}
                >
                  <span className="text-sm">
                    {s.action}
                    {s.comingSoon && (
                      <span className="ml-2 text-[10px] text-muted-foreground uppercase">
                        coming soon
                      </span>
                    )}
                  </span>
                  <span className="flex items-center gap-1">
                    {s.keys.map((k, ki) => (
                      <span key={ki} className="flex items-center gap-1">
                        {ki > 0 && <span className="text-muted-foreground/60">+</span>}
                        <Kbd>{k}</Kbd>
                      </span>
                    ))}
                  </span>
                </div>
              ))}
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
