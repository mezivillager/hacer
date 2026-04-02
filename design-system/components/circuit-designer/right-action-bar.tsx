"use client"

import { useState } from "react"
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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"

interface CircuitInfo {
  gates: number
  wires: number
  inputs: number
  outputs: number
  status: "Paused" | "Running"
}

interface HistoryEntry {
  id: string
  action: string
  timestamp: Date
}

interface RightActionBarProps {
  circuitInfo: CircuitInfo
  historyEntries?: HistoryEntry[]
  onUndo?: () => void
  onRedo?: () => void
  canUndo?: boolean
  canRedo?: boolean
}

type ActivePanel = "info" | "history" | "layers" | null

export function RightActionBar({
  circuitInfo,
  historyEntries = [],
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
}: RightActionBarProps) {
  const [activePanel, setActivePanel] = useState<ActivePanel>(null)

  const togglePanel = (panel: ActivePanel) => {
    setActivePanel(activePanel === panel ? null : panel)
  }

  const panelWidth = 280

  return (
    <div 
      className={cn(
        "absolute top-0 right-0 h-full flex transition-all duration-200 ease-out",
      )}
    >
      {/* Action Bar - Left of Drawer */}
      <div 
        className={cn(
          "flex flex-col h-full py-3 px-1.5 bg-card/80 backdrop-blur-sm border-l border-border",
          "transition-all duration-200 ease-out"
        )}
      >
        <div className="flex flex-col gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={activePanel === "info" ? "secondary" : "ghost"}
                size="icon"
                className="w-8 h-8"
                onClick={() => togglePanel("info")}
              >
                <Info className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Circuit Info</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={activePanel === "layers" ? "secondary" : "ghost"}
                size="icon"
                className="w-8 h-8"
                onClick={() => togglePanel("layers")}
              >
                <Layers className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Layers</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={activePanel === "history" ? "secondary" : "ghost"}
                size="icon"
                className="w-8 h-8"
                onClick={() => togglePanel("history")}
              >
                <History className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">History</TooltipContent>
          </Tooltip>

          <Separator className="my-1" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8"
                onClick={onUndo}
                disabled={!canUndo}
              >
                <Undo2 className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Undo (Cmd+Z)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8"
                onClick={onRedo}
                disabled={!canRedo}
              >
                <Redo2 className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Redo (Cmd+Shift+Z)</TooltipContent>
          </Tooltip>

          <Separator className="my-1" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="w-8 h-8">
                <Search className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Find (Cmd+F)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="w-8 h-8">
                <Maximize2 className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Fit to View</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Drawer Panel - Always aligned to right edge */}
      <div
        className={cn(
          "h-full bg-card border-l border-border overflow-hidden",
          "transition-all duration-200 ease-out"
        )}
        style={{ width: activePanel ? panelWidth : 0 }}
      >
        <div className="flex flex-col h-full" style={{ width: panelWidth }}>
          {/* Panel Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
            <h3 className="text-sm font-semibold">
              {activePanel === "info" && "Circuit Info"}
              {activePanel === "layers" && "Layers"}
              {activePanel === "history" && "History"}
            </h3>
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7"
              onClick={() => setActivePanel(null)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {activePanel === "info" && (
              <CircuitInfoPanel circuitInfo={circuitInfo} />
            )}
            {activePanel === "layers" && <LayersPanel />}
            {activePanel === "history" && (
              <HistoryPanel entries={historyEntries} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function CircuitInfoPanel({ circuitInfo }: { circuitInfo: CircuitInfo }) {
  return (
    <div className="space-y-4">
      {/* Status Indicator */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
        <div className="flex items-center gap-2">
          {circuitInfo.status === "Running" ? (
            <Play className="w-3 h-3 text-primary" />
          ) : (
            <Pause className="w-3 h-3 text-muted-foreground" />
          )}
          <span className="text-xs text-muted-foreground">Status</span>
        </div>
        <span
          className={cn(
            "text-xs font-medium px-2 py-0.5 rounded-full",
            circuitInfo.status === "Running"
              ? "bg-primary/20 text-primary"
              : "bg-muted text-muted-foreground"
          )}
        >
          {circuitInfo.status}
        </span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Gates" value={circuitInfo.gates} />
        <StatCard label="Wires" value={circuitInfo.wires} />
        <StatCard label="Inputs" value={circuitInfo.inputs} />
        <StatCard label="Outputs" value={circuitInfo.outputs} />
      </div>

      {/* Quick Actions */}
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

function LayersPanel() {
  const layers = [
    { id: "gates", name: "Gates", count: 2, visible: true },
    { id: "wires", name: "Wires", count: 1, visible: true },
    { id: "inputs", name: "Inputs", count: 1, visible: true },
    { id: "outputs", name: "Outputs", count: 1, visible: true },
    { id: "labels", name: "Labels", count: 5, visible: true },
  ]

  return (
    <div className="space-y-2">
      {layers.map((layer) => (
        <div
          key={layer.id}
          className="flex items-center justify-between p-2 rounded-md hover:bg-secondary/50 cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "w-2 h-2 rounded-full",
                layer.visible ? "bg-primary" : "bg-muted"
              )}
            />
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

function HistoryPanel({ entries }: { entries: HistoryEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <History className="w-8 h-8 mb-2 opacity-50" />
        <p className="text-sm">No history yet</p>
        <p className="text-xs">Actions will appear here</p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="flex items-center justify-between p-2 rounded-md hover:bg-secondary/50 cursor-pointer"
        >
          <span className="text-sm">{entry.action}</span>
          <span className="text-xs text-muted-foreground">
            {entry.timestamp.toLocaleTimeString()}
          </span>
        </div>
      ))}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-3 rounded-lg bg-secondary/30 border border-border">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className="text-xl font-semibold tabular-nums">{value}</p>
    </div>
  )
}

function QuickActionButton({
  icon: Icon,
  label,
}: {
  icon: React.ElementType
  label: string
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="w-full justify-between h-8 text-xs"
    >
      <div className="flex items-center gap-2">
        <Icon className="w-3 h-3" />
        {label}
      </div>
      <ChevronRight className="w-3 h-3 text-muted-foreground" />
    </Button>
  )
}
