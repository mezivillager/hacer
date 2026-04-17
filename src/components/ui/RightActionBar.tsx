import { useState } from 'react'
import {
  Info,
  History,
  Layers,
  Settings2,
  Download,
  Upload,
  Search,
  Maximize2,
  X,
  ChevronRight,
  Pause,
  Play,
  Undo2,
  Redo2,
} from 'lucide-react'
import { Button } from '@/components/ui-kit/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui-kit/tooltip'
import { Separator } from '@/components/ui-kit/separator'
import { cn } from '@/lib/utils'
import { ComingSoon } from './coming-soon'
import { useCircuitStore } from '@/store/circuitStore'

type ActivePanel = 'info' | 'history' | 'layers' | null

const PANEL_WIDTH = 280

export function RightActionBar() {
  const [activePanel, setActivePanel] = useState<ActivePanel>(null)

  const togglePanel = (p: ActivePanel) => {
    setActivePanel(activePanel === p ? null : p)
  }

  return (
    <div
      data-testid="right-action-bar"
      className="absolute top-0 right-0 h-full flex transition-all duration-200 ease-out z-10"
    >
      {/* Action Bar */}
      <div className="flex flex-col h-full py-3 px-1.5 bg-card/80 backdrop-blur-sm border-l border-border">
        <div className="flex flex-col gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                data-testid="right-bar-info-trigger"
                variant={activePanel === 'info' ? 'secondary' : 'ghost'}
                size="icon"
                className="w-8 h-8"
                onClick={() => togglePanel('info')}
              >
                <Info className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Circuit Info</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                data-testid="right-bar-layers-trigger"
                variant={activePanel === 'layers' ? 'secondary' : 'ghost'}
                size="icon"
                className="w-8 h-8"
                onClick={() => togglePanel('layers')}
              >
                <Layers className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Layers</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                data-testid="right-bar-history-trigger"
                variant={activePanel === 'history' ? 'secondary' : 'ghost'}
                size="icon"
                className="w-8 h-8"
                onClick={() => togglePanel('history')}
              >
                <History className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">History</TooltipContent>
          </Tooltip>

          <Separator className="my-1" />

          <ComingSoon>
            <Button
              data-testid="right-bar-undo"
              variant="ghost"
              size="icon"
              className="w-8 h-8"
              disabled
            >
              <Undo2 className="w-4 h-4" />
            </Button>
          </ComingSoon>

          <ComingSoon>
            <Button
              data-testid="right-bar-redo"
              variant="ghost"
              size="icon"
              className="w-8 h-8"
              disabled
            >
              <Redo2 className="w-4 h-4" />
            </Button>
          </ComingSoon>

          <Separator className="my-1" />

          <ComingSoon>
            <Button
              data-testid="right-bar-find"
              variant="ghost"
              size="icon"
              className="w-8 h-8"
              disabled
            >
              <Search className="w-4 h-4" />
            </Button>
          </ComingSoon>

          <ComingSoon>
            <Button
              data-testid="right-bar-maximize"
              variant="ghost"
              size="icon"
              className="w-8 h-8"
              disabled
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
          </ComingSoon>
        </div>
      </div>

      {/* Drawer */}
      <div
        data-testid="right-bar-drawer"
        className={cn(
          'h-full bg-card border-l border-border overflow-hidden transition-all duration-200 ease-out',
        )}
        style={{ width: activePanel ? PANEL_WIDTH : 0 }}
      >
        <div className="flex flex-col h-full" style={{ width: PANEL_WIDTH }}>
          {/* Panel header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
            <h3 className="text-sm font-semibold">
              {activePanel === 'info' && 'Circuit Info'}
              {activePanel === 'layers' && 'Layers'}
              {activePanel === 'history' && 'History'}
            </h3>
            <Button
              data-testid="right-bar-drawer-close"
              variant="ghost"
              size="icon"
              className="w-7 h-7"
              onClick={() => setActivePanel(null)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Panel content */}
          <div className="flex-1 overflow-y-auto p-4">
            {activePanel === 'info' && <CircuitInfoPanel />}
            {activePanel === 'layers' && <LayersPanel />}
            {activePanel === 'history' && <HistoryPanel />}
          </div>
        </div>
      </div>
    </div>
  )
}

function CircuitInfoPanel() {
  const gatesCount = useCircuitStore((s) => s.gates.length)
  const wiresCount = useCircuitStore((s) => s.wires.length)
  const inputsCount = useCircuitStore((s) => s.inputNodes.length)
  const outputsCount = useCircuitStore((s) => s.outputNodes.length)
  const simulationRunning = useCircuitStore((s) => s.simulationRunning)

  return (
    <div data-testid="info-panel" className="space-y-4">
      {/* Status pill */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
        <div className="flex items-center gap-2">
          {simulationRunning ? (
            <Play className="w-3 h-3 text-primary" />
          ) : (
            <Pause className="w-3 h-3 text-muted-foreground" />
          )}
          <span className="text-xs text-muted-foreground">Status</span>
        </div>
        <span
          data-testid="info-status-pill"
          className={cn(
            'text-xs font-medium px-2 py-0.5 rounded-full',
            simulationRunning ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground',
          )}
        >
          {simulationRunning ? 'Running' : 'Paused'}
        </span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard testId="info-stat-gates" label="Gates" value={gatesCount} />
        <StatCard testId="info-stat-wires" label="Wires" value={wiresCount} />
        <StatCard testId="info-stat-inputs" label="Inputs" value={inputsCount} />
        <StatCard testId="info-stat-outputs" label="Outputs" value={outputsCount} />
      </div>

      {/* Quick actions (all stubbed) */}
      <div className="pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground mb-3">Quick Actions</p>
        <div className="space-y-2">
          <ComingSoon>
            <QuickActionButton icon={Download} label="Export Circuit" />
          </ComingSoon>
          <ComingSoon>
            <QuickActionButton icon={Upload} label="Import Circuit" />
          </ComingSoon>
          <ComingSoon>
            <QuickActionButton icon={Settings2} label="Generate Truth Table" />
          </ComingSoon>
        </div>
      </div>
    </div>
  )
}

function LayersPanel() {
  return (
    <div
      data-testid="layers-panel"
      className="flex flex-col items-center justify-center py-8 text-muted-foreground"
    >
      <Layers className="w-8 h-8 mb-2 opacity-50" />
      <p className="text-sm">Coming soon</p>
      <p className="text-xs">Visibility controls will appear here</p>
    </div>
  )
}

function HistoryPanel() {
  return (
    <div
      data-testid="history-panel"
      className="flex flex-col items-center justify-center py-8 text-muted-foreground"
    >
      <History className="w-8 h-8 mb-2 opacity-50" />
      <p className="text-sm">No history yet</p>
      <p className="text-xs">Coming soon</p>
    </div>
  )
}

function StatCard({ testId, label, value }: { testId: string; label: string; value: number }) {
  return (
    <div data-testid={testId} className="p-3 rounded-lg bg-secondary/30 border border-border">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <p className="text-xl font-semibold tabular-nums">{value}</p>
    </div>
  )
}

type IconComponent = React.ComponentType<{ className?: string }>

function QuickActionButton({ icon: Icon, label }: { icon: IconComponent; label: string }) {
  return (
    <Button variant="ghost" size="sm" className="w-full justify-between h-8 text-xs" disabled>
      <div className="flex items-center gap-2">
        <Icon className="w-3 h-3" />
        {label}
      </div>
      <ChevronRight className="w-3 h-3 text-muted-foreground" />
    </Button>
  )
}
