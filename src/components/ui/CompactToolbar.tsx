import { useState } from 'react'
import {
  Cpu,
  Play,
  Pause,
  Trash2,
  RotateCcw,
  Settings,
  Github,
  Grid3X3,
  ChevronDown,
  Moon,
  ArrowRightToLine,
  ArrowLeftFromLine,
  GitBranch,
} from 'lucide-react'
import { cn } from '@lib/utils'
import {
  Button,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Separator,
  Switch,
} from './shadcn'
import { useCircuitStore } from '@/store/circuitStore'
import type { GateType, NodePlacementType } from '@/store/types'
import { getGateIcon } from '@/gates/icons'
import { handleDeleteSelected, handleGateSelect } from './handlers/uiHandlers'
import { NodeRenameControl } from './NodeRenameControl'
import { useAppReleaseVersion } from '@/hooks/useAppReleaseVersion'

const ELEMENTARY_GATES: GateType[] = ['NAND', 'AND', 'OR', 'NOT', 'XOR']

const ioElements: { id: NodePlacementType | 'JUNCTION'; name: string; icon: typeof ArrowRightToLine }[] = [
  { id: 'INPUT', name: 'Input', icon: ArrowRightToLine },
  { id: 'OUTPUT', name: 'Output', icon: ArrowLeftFromLine },
  { id: 'JUNCTION', name: 'Junction', icon: GitBranch },
]

export function CompactToolbar() {
  const [gatesOpen, setGatesOpen] = useState(false)
  const [ioOpen, setIoOpen] = useState(false)

  // Zustand selectors
  const showAxes = useCircuitStore((s) => s.showAxes)
  const simulationRunning = useCircuitStore((s) => s.simulationRunning)
  const placementMode = useCircuitStore((s) => s.placementMode)
  const nodePlacementMode = useCircuitStore((s) => s.nodePlacementMode)
  const junctionPlacementMode = useCircuitStore((s) => s.junctionPlacementMode)
  const selectedGateId = useCircuitStore((s) => s.selectedGateId)
  const selectedWireId = useCircuitStore((s) => s.selectedWireId)
  const selectedNodeId = useCircuitStore((s) => s.selectedNodeId)
  const selectedNodeType = useCircuitStore((s) => s.selectedNodeType)
  const gatesCount = useCircuitStore((s) => s.gates.length)

  // Actions
  const toggleAxes = useCircuitStore((s) => s.toggleAxes)
  const toggleSimulation = useCircuitStore((s) => s.toggleSimulation)
  const startPlacement = useCircuitStore((s) => s.startPlacement)
  const cancelPlacement = useCircuitStore((s) => s.cancelPlacement)
  const startNodePlacement = useCircuitStore((s) => s.startNodePlacement)
  const cancelNodePlacement = useCircuitStore((s) => s.cancelNodePlacement)
  const startJunctionPlacement = useCircuitStore((s) => s.startJunctionPlacement)
  const cancelJunctionPlacement = useCircuitStore((s) => s.cancelJunctionPlacement)
  const removeGate = useCircuitStore((s) => s.removeGate)
  const removeWire = useCircuitStore((s) => s.removeWire)
  const removeInputNode = useCircuitStore((s) => s.removeInputNode)
  const removeOutputNode = useCircuitStore((s) => s.removeOutputNode)
  const clearCircuit = useCircuitStore((s) => s.clearCircuit)

  const hasSelection = selectedGateId !== null || selectedWireId !== null || selectedNodeId !== null
  const hasNodeSelected = selectedNodeId !== null

  const appVersion = useAppReleaseVersion()

  const cancelAllPlacement = () => {
    cancelPlacement()
    cancelNodePlacement()
    cancelJunctionPlacement()
  }

  const handleIoSelect = (id: NodePlacementType | 'JUNCTION') => {
    if (id === 'JUNCTION') {
      const wasActive = !!junctionPlacementMode
      cancelAllPlacement()
      if (!wasActive) {
        startJunctionPlacement()
      }
    } else {
      const wasActive = nodePlacementMode === id
      cancelAllPlacement()
      if (!wasActive) {
        startNodePlacement(id)
      }
    }
    setIoOpen(false)
  }

  const isIoActive = (id: NodePlacementType | 'JUNCTION') => {
    if (id === 'JUNCTION') return !!junctionPlacementMode
    return nodePlacementMode === id
  }

  return (
    <div
      className="flex flex-col h-full w-12 bg-sidebar border-r border-sidebar-border"
      data-testid="compact-toolbar"
    >
      {/* Logo */}
      <div className="flex items-center justify-center h-12 border-b border-sidebar-border">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 text-primary">
              <Cpu className="w-4 h-4" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p className="font-semibold">HACER</p>
            <p className="text-xs text-muted-foreground">
              Hardware Architecture &amp; Constraints Explorer/Researcher
            </p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Main Tools */}
      <div className="flex-1 flex flex-col items-center py-2 gap-1">
        {/* Gates Dropdown */}
        <Popover open={gatesOpen} onOpenChange={setGatesOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn('w-9 h-9 relative', gatesOpen && 'bg-sidebar-accent')}
                  aria-label="Gates"
                  data-testid="gates-dropdown-trigger"
                >
                  <Cpu className="w-5 h-5" />
                  <ChevronDown className="w-2 h-2 absolute bottom-1 right-1 opacity-60" />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="right">Gates</TooltipContent>
          </Tooltip>
          <PopoverContent side="right" align="start" className="w-48 p-2" data-testid="gates-dropdown">
            <div className="text-xs font-medium text-muted-foreground mb-2 px-2">Elementary Gates</div>
            <div className="grid grid-cols-2 gap-1">
              {ELEMENTARY_GATES.map((type) => {
                const IconComponent = getGateIcon(type)
                return (
                  <Button
                    key={type}
                    variant={placementMode === type ? 'secondary' : 'ghost'}
                    size="sm"
                    className="justify-start gap-2 h-8"
                    data-testid={`gate-button-${type}`}
                    onClick={() => {
                      cancelAllPlacement()
                      handleGateSelect(type, placementMode, startPlacement, cancelPlacement)
                      setGatesOpen(false)
                    }}
                  >
                    <IconComponent size={16} />
                    <span className="text-xs">{type}</span>
                  </Button>
                )
              })}
            </div>
          </PopoverContent>
        </Popover>

        {/* I/O Dropdown */}
        <Popover open={ioOpen} onOpenChange={setIoOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn('w-9 h-9 relative', ioOpen && 'bg-sidebar-accent')}
                  aria-label="Circuit I/O"
                  data-testid="io-dropdown-trigger"
                >
                  <ArrowRightToLine className="w-4 h-4" />
                  <ChevronDown className="w-2 h-2 absolute bottom-1 right-1 opacity-60" />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="right">Circuit I/O</TooltipContent>
          </Tooltip>
          <PopoverContent side="right" align="start" className="w-40 p-2" data-testid="io-dropdown">
            <div className="text-xs font-medium text-muted-foreground mb-2 px-2">Circuit I/O</div>
            <div className="flex flex-col gap-1">
              {ioElements.map((element) => {
                const Icon = element.icon
                return (
                  <Button
                    key={element.id}
                    variant={isIoActive(element.id) ? 'secondary' : 'ghost'}
                    size="sm"
                    className="justify-start gap-2 h-8"
                    data-testid={`io-button-${element.id}`}
                    onClick={() => handleIoSelect(element.id)}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-xs">{element.name}</span>
                  </Button>
                )
              })}
            </div>
          </PopoverContent>
        </Popover>

        <Separator className="my-1 w-6" />

        {/* Simulation Controls */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={simulationRunning ? 'default' : 'ghost'}
              size="icon"
              className="w-9 h-9"
              onClick={toggleSimulation}
              aria-label={simulationRunning ? 'Pause Simulation' : 'Run Simulation'}
              data-testid="simulation-toggle"
            >
              {simulationRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {simulationRunning ? 'Pause Simulation' : 'Run Simulation'}
          </TooltipContent>
        </Tooltip>

        <Separator className="my-1 w-6" />

        {/* View Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={showAxes ? 'secondary' : 'ghost'}
              size="icon"
              className="w-9 h-9"
              onClick={toggleAxes}
              aria-label="Show Axes"
              data-testid="axes-toggle"
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <div className="flex items-center gap-2">
              <span>Show Axes</span>
              <Switch
                checked={showAxes}
                className="pointer-events-none scale-75"
                tabIndex={-1}
                aria-hidden="true"
              />
            </div>
          </TooltipContent>
        </Tooltip>

        {/* Delete */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="w-9 h-9 text-muted-foreground hover:text-destructive"
              disabled={!hasSelection}
              aria-label="Delete Selected"
              onClick={() =>
                handleDeleteSelected(
                  selectedGateId,
                  selectedWireId,
                  selectedNodeId,
                  selectedNodeType,
                  removeGate,
                  removeWire,
                  removeInputNode,
                  removeOutputNode,
                )
              }
              data-testid="delete-selected"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Delete Selected</TooltipContent>
        </Tooltip>

        {/* Clear All */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="w-9 h-9 text-muted-foreground hover:text-destructive"
              disabled={gatesCount === 0}
              aria-label="Clear All"
              onClick={clearCircuit}
              data-testid="clear-all"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Clear All</TooltipContent>
        </Tooltip>

        {/* Node Rename Popover - shows when a node is selected */}
        {hasNodeSelected && (
          <Popover>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="w-9 h-9"
                    aria-label="Rename Node"
                    data-testid="node-rename-trigger"
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent side="right">Rename Node</TooltipContent>
            </Tooltip>
            <PopoverContent side="right" align="start" className="w-56 p-3">
              <NodeRenameControl />
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* Bottom Actions */}
      <div className="flex flex-col items-center py-2 gap-1 border-t border-sidebar-border">
        {/* Theme indicator (dark-only for now; full theme switching in Phase 7) */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="w-9 h-9" aria-label="Theme" disabled>
              <Moon className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Theme (Dark)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="w-9 h-9" aria-label="GitHub" asChild>
              <a
                href="https://github.com/mezivillager/hacer"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="w-4 h-4" />
              </a>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">GitHub</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="w-9 h-9" aria-label="Settings" disabled>
              <Settings className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Settings</TooltipContent>
        </Tooltip>

        <div className="text-[10px] text-muted-foreground mt-1" data-testid="app-version">
          {appVersion}
        </div>
      </div>
    </div>
  )
}
