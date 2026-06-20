import type { ReactNode } from 'react'
import { StatusBar } from '@/components/ui/StatusBar'
import { CompactToolbar } from '@/components/ui/CompactToolbar'
import { RightActionBar } from '@/components/ui/RightActionBar'
import { PropertiesPanel } from '@/components/ui/PropertiesPanel'
import { HelpBar } from '@/components/ui/HelpBar'
import { DemoOverlay } from '@/components/ui/DemoOverlay'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'

interface ShellProps {
  /**
   * The 3D scene area, injected by the app (`<CanvasArea />`). The shell renders it as a
   * child rather than importing it, which keeps the DOM shell decoupled from R3F and lets
   * RTL integration tests mount the full shell with no Canvas. See `src/test/renderShell.tsx`.
   */
  scene?: ReactNode
}

/**
 * The non-3D DOM shell: toolbar, side panels, status bar, overlays. The 3D scene is an
 * injected `scene` prop — this is the contract boundary between the 3D and non-3D areas.
 */
export function Shell({ scene = null }: ShellProps) {
  // Global keyboard shortcut handler (HelpBar adds the "?"-opens-modal binding separately).
  useKeyboardShortcuts()
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      <CompactToolbar />
      <div className="flex-1 relative">
        {scene}
        <RightActionBar />
        <PropertiesPanel />
        <StatusBar />
        <HelpBar />
        <DemoOverlay />
      </div>
    </div>
  )
}
