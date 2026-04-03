import { useState } from 'react'
import {
  Info,
  History,
  Layers,
  X,
  ChevronRight,
  Pause,
  Play,
  Search,
  Maximize2,
  Download,
  Upload,
  Settings2,
} from 'lucide-react'
import { cn } from '@lib/utils'
import {
  Button,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  Separator,
} from './shadcn'
import { useCircuitStore } from '@/store/circuitStore'
import type { LucideIcon } from 'lucide-react'

type ActivePanel = 'info' | 'history' | 'layers' | null

export function RightActionBar() {
  const [activePanel, setActivePanel] = useState<ActivePanel>(null)

  // Zustand selectors
  const gateCount = useCircuitStore((s) => s.gates.length)
  const wireCount = useCircuitStore((s) => s.wires.length)
  const inputCount = useCircuitStore((s) => s.inputNodes.length)
  const outputCount = useCircuitStore((s) => s.outputNodes.length)
  const simulationRunning = useCircuitStore((s) => s.simulationRunning)

  const togglePanel = (panel: ActivePanel) => {
    setActivePanel(activePanel === panel ? null : panel)
  }

  const panelWidth = 280
  const status = simulationRunning ? 'Running' : 'Paused'

  return (
    <div
      className="absolute top-0 right-0 h-full flex transition-all duration-200 ease-out"
      data-testid="right-action-bar"
    >
      {/* Icon bar */}
      <div className="flex flex-col h-full py-3 px-1.5 bg-card/80 backdrop-blur-sm border-l border-border transition-all duration-200 ease-out">
        <div className="flex flex-col gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={activePanel === 'info' ? 'secondary' : 'ghost'}
                size="icon"
                className="w-8 h-8"
                onClick={() => togglePanel('info')}
                data-testid="right-panel-info-toggle"
              >
                <Info className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Circuit Info</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={activePanel === 'layers' ? 'secondary' : 'ghost'}
                size="icon"
                className="w-8 h-8"
                onClick={() => togglePanel('layers')}
                data-testid="right-panel-layers-toggle"
              >
                <Layers className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Layers</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={activePanel === 'history' ? 'secondary' : 'ghost'}
                size="icon"
                className="w-8 h-8"
                onClick={() => togglePanel('history')}
                data-testid="right-panel-history-toggle"
              >
                <History className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">History</TooltipContent>
          </Tooltip>

          <Separator className="my-1" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="w-8 h-8" disabled>
                <Search className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Find (Cmd+F)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="w-8 h-8" disabled>
                <Maximize2 className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Fit to View</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Drawer panel */}
      <div
        className={cn(
          'h-full bg-card border-l border-border overflow-hidden',
          'transition-all duration-200 ease-out',
        )}
        style={{ width: activePanel ? panelWidth : 0 }}
        data-testid="right-panel-drawer"
      >
        <div className="flex flex-col h-full" style={{ width: panelWidth }}>
          {/* Panel header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
            <h3 className="text-sm font-semibold" data-testid="right-panel-title">
              {activePanel === 'info' && 'Circuit Info'}
              {activePanel === 'layers' && 'Layers'}
              {activePanel === 'history' && 'History'}
            </h3>
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7"
              onClick={() => setActivePanel(null)}
              data-testid="right-panel-close"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Panel content */}
          <div className="flex-1 overflow-y-auto p-4">
            {activePanel === 'info' && (
              <CircuitInfoPanel
                gates={gateCount}
                wires={wireCount}
                inputs={inputCount}
                outputs={outputCount}
                status={status}
              />
            )}
            {activePanel === 'layers' && (
              <LayersPanel
                gates={gateCount}
                wires={wireCount}
                inputs={inputCount}
                outputs={outputCount}
              />
            )}
            {activePanel === 'history' && <HistoryPanel />}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------- Sub-panels ---------- */

function CircuitInfoPanel({
  gates,
  wires,
  inputs,
  outputs,
  status,
}: {
  gates: number
  wires: number
  inputs: number
  outputs: number
  status: 'Paused' | 'Running'
}) {
  return (
    <div className="space-y-4">
      {/* Status */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
        <div className="flex items-center gap-2">
          {status === 'Running' ? (
            <Play className="w-3 h-3 text-primary" />
          ) : (
            <Pause className="w-3 h-3 text-muted-foreground" />
          )}
          <span className="text-xs text-muted-foreground">Status</span>
        </div>
        <span
          className={cn(
            'text-xs font-medium px-2 py-0.5 rounded-full',
            status === 'Running'
              ? 'bg-primary/20 text-primary'
              : 'bg-muted text-muted-foreground',
          )}
          data-testid="circuit-info-status"
        >
          {status}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Gates" value={gates} testId="circuit-info-gates" />
        <StatCard label="Wires" value={wires} testId="circuit-info-wires" />
        <StatCard label="Inputs" value={inputs} testId="circuit-info-inputs" />
        <StatCard label="Outputs" value={outputs} testId="circuit-info-outputs" />
      </div>

      {/* Quick Actions (stubs) */}
      <div className="pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground mb-3">Quick Actions</p>
        <div className="space-y-2">
          <QuickActionButton icon={Download} label="Export Circuit" />
          <QuickActionButton icon={Upload} label="Import Circuit" />
          <QuickActionButton icon={Settings2} label="Generate Truth Table" />
        </div>
      </div>
    </div>
  )
}

function LayersPanel({
  gates,
  wires,
  inputs,
  outputs,
}: {
  gates: number
  wires: number
  inputs: number
  outputs: number
}) {
  const layers = [
    { id: 'gates', name: 'Gates', count: gates },
    { id: 'wires', name: 'Wires', count: wires },
    { id: 'inputs', name: 'Inputs', count: inputs },
    { id: 'outputs', name: 'Outputs', count: outputs },
  ]

  return (
    <div className="space-y-2">
      {layers.map((layer) => (
        <div
          key={layer.id}
          className="flex items-center justify-between p-2 rounded-md hover:bg-secondary/50 cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-sm">{layer.name}</span>
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">
            {layer.count}
          </span>
        </div>
      ))}
    </div>
  )
}

function HistoryPanel() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
      <History className="w-8 h-8 mb-2 opacity-50" />
      <p className="text-sm">No history yet</p>
      <p className="text-xs">Actions will appear here</p>
    </div>
  )
}

function StatCard({
  label,
  value,
  testId,
}: {
  label: string
  value: number
  testId?: string
}) {
  return (
    <div className="p-3 rounded-lg bg-secondary/30 border border-border">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className="text-xl font-semibold tabular-nums" data-testid={testId}>
        {value}
      </p>
    </div>
  )
}

function QuickActionButton({
  icon: Icon,
  label,
}: {
  icon: LucideIcon
  label: string
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="w-full justify-between h-8 text-xs"
      disabled
    >
      <div className="flex items-center gap-2">
        <Icon className="w-3 h-3" />
        {label}
      </div>
      <ChevronRight className="w-3 h-3 text-muted-foreground" />
    </Button>
  )
}
