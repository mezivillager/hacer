import { useState } from 'react'
import { useTheme } from 'next-themes'
import {
  Cpu,
  Play,
  Pause,
  Trash2,
  RotateCcw,
  Settings,
  Github,
  Grid3X3,
  CircleDot,
  ArrowRightFromLine,
  GitBranch,
  ChevronDown,
  Sun,
  Moon,
  Monitor,
  Info,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui-kit/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui-kit/tooltip'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui-kit/popover'
import { Separator } from '@/components/ui-kit/separator'
import { Switch } from '@/components/ui-kit/switch'
import { ComingSoon } from './coming-soon'
import {
  NandGateIcon,
  AndGateIcon,
  OrGateIcon,
  NotGateIcon,
  NorGateIcon,
  XorGateIcon,
  XnorGateIcon,
} from './icons/GateGlyphs'
import { useCircuitStore, circuitActions } from '@/store/circuitStore'
import { useAppReleaseVersion } from '@/hooks/useAppReleaseVersion'
import type { GateType } from '@/store/types'

const gates: Array<{ type: GateType; Icon: React.ComponentType<{ className?: string }> }> = [
  { type: 'NAND', Icon: NandGateIcon },
  { type: 'AND', Icon: AndGateIcon },
  { type: 'OR', Icon: OrGateIcon },
  { type: 'NOT', Icon: NotGateIcon },
  { type: 'NOR', Icon: NorGateIcon },
  { type: 'XOR', Icon: XorGateIcon },
  { type: 'XNOR', Icon: XnorGateIcon },
]

const ioElements = [
  { id: 'input', label: 'Input', Icon: ArrowRightFromLine },
  { id: 'output', label: 'Output', Icon: CircleDot },
  { id: 'junction', label: 'Junction', Icon: GitBranch },
] as const

type IoKind = 'input' | 'output' | 'junction'

const NODE_PLACEMENT_BY_IO = { input: 'INPUT', output: 'OUTPUT' } as const

export function CompactToolbar() {
  const placementMode = useCircuitStore((s) => s.placementMode)
  const nodePlacementMode = useCircuitStore((s) => s.nodePlacementMode)
  const junctionPlacementMode = useCircuitStore((s) => s.junctionPlacementMode)
  const simulationRunning = useCircuitStore((s) => s.simulationRunning)
  const showAxes = useCircuitStore((s) => s.showAxes)
  const propertiesPanelOpen = useCircuitStore((s) => s.propertiesPanelOpen)
  const gatesCount = useCircuitStore((s) => s.gates.length)
  const selectedGateId = useCircuitStore((s) => s.selectedGateId)
  const selectedWireId = useCircuitStore((s) => s.selectedWireId)
  const selectedNodeId = useCircuitStore((s) => s.selectedNodeId)
  const selectedNodeType = useCircuitStore((s) => s.selectedNodeType)

  const hasSelection =
    selectedGateId !== null || selectedWireId !== null || selectedNodeId !== null

  const [gatesOpen, setGatesOpen] = useState(false)
  const [ioOpen, setIoOpen] = useState(false)
  const { theme, setTheme } = useTheme()

  const handleGateSelect = (type: GateType) => {
    if (placementMode === type) {
      circuitActions.cancelPlacement()
    } else {
      circuitActions.startPlacement(type)
    }
    setGatesOpen(false)
  }

  const isIoActive = (id: IoKind): boolean => {
    if (id === 'junction') return junctionPlacementMode === true
    return nodePlacementMode === NODE_PLACEMENT_BY_IO[id]
  }

  const handleIoSelect = (id: IoKind) => {
    if (id === 'junction') {
      if (junctionPlacementMode === true) {
        circuitActions.cancelJunctionPlacement()
      } else {
        circuitActions.startJunctionPlacement()
      }
    } else {
      const mappedType = NODE_PLACEMENT_BY_IO[id]
      if (nodePlacementMode === mappedType) {
        circuitActions.cancelNodePlacement()
      } else {
        circuitActions.startNodePlacement(mappedType)
      }
    }
    setIoOpen(false)
  }

  const handleDelete = () => {
    if (selectedGateId) {
      circuitActions.removeGate(selectedGateId)
    } else if (selectedWireId) {
      circuitActions.removeWire(selectedWireId)
    } else if (selectedNodeId && selectedNodeType === 'input') {
      circuitActions.removeInputNode(selectedNodeId)
    } else if (selectedNodeId && selectedNodeType === 'output') {
      circuitActions.removeOutputNode(selectedNodeId)
    }
  }

  const version = useAppReleaseVersion()

  return (
    <div
      data-testid="compact-toolbar"
      className="flex flex-col h-full w-12 bg-sidebar border-r border-sidebar-border"
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
              Hardware Architecture & Constraints Explorer
            </p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Main tools */}
      <div className="flex-1 flex flex-col items-center py-2 gap-1">
        {/* Gates popover */}
        <Popover open={gatesOpen} onOpenChange={setGatesOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  data-testid="toolbar-gates-trigger"
                  variant="ghost"
                  size="icon"
                  className={cn('w-9 h-9 relative', gatesOpen && 'bg-sidebar-accent')}
                >
                  <NandGateIcon className="w-5 h-5" />
                  <ChevronDown className="w-2 h-2 absolute bottom-1 right-1 opacity-60" />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="right">Gates</TooltipContent>
          </Tooltip>
          <PopoverContent
            data-testid="gates-popover"
            side="right"
            align="start"
            className="w-48 p-2"
          >
            <div className="text-xs font-medium text-muted-foreground mb-2 px-2">
              Elementary Gates
            </div>
            <div className="grid grid-cols-2 gap-1">
              {gates.map(({ type, Icon }) => (
                <Button
                  key={type}
                  data-testid={`gate-button-${type}`}
                  variant={placementMode === type ? 'secondary' : 'ghost'}
                  size="sm"
                  className="justify-start gap-2 h-8"
                  onClick={() => handleGateSelect(type)}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-xs">{type}</span>
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* I/O popover */}
        <Popover open={ioOpen} onOpenChange={setIoOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  data-testid="toolbar-io-trigger"
                  variant="ghost"
                  size="icon"
                  className={cn('w-9 h-9 relative', ioOpen && 'bg-sidebar-accent')}
                >
                  <CircleDot className="w-4 h-4" />
                  <ChevronDown className="w-2 h-2 absolute bottom-1 right-1 opacity-60" />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="right">Circuit I/O</TooltipContent>
          </Tooltip>
          <PopoverContent
            data-testid="io-popover"
            side="right"
            align="start"
            className="w-40 p-2"
          >
            <div className="text-xs font-medium text-muted-foreground mb-2 px-2">Circuit I/O</div>
            <div className="flex flex-col gap-1">
              {ioElements.map(({ id, label, Icon }) => (
                <Button
                  key={id}
                  data-testid={`io-button-${id}`}
                  variant={isIoActive(id) ? 'secondary' : 'ghost'}
                  size="sm"
                  className="justify-start gap-2 h-8"
                  onClick={() => handleIoSelect(id)}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-xs">{label}</span>
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Separator className="my-1 w-6" />

        {/* Sim toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              data-testid="toolbar-sim-toggle"
              variant={simulationRunning ? 'default' : 'ghost'}
              size="icon"
              className="w-9 h-9"
              aria-pressed={simulationRunning}
              onClick={() => circuitActions.toggleSimulation()}
            >
              {simulationRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {simulationRunning ? 'Pause Simulation' : 'Run Simulation'}
          </TooltipContent>
        </Tooltip>

        <Separator className="my-1 w-6" />

        {/* Axes toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              data-testid="toolbar-axes-toggle"
              variant={showAxes ? 'secondary' : 'ghost'}
              size="icon"
              className="w-9 h-9"
              onClick={() => circuitActions.toggleAxes()}
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <div className="flex items-center gap-2">
              <span>Show Axes</span>
              <Switch checked={showAxes} className="scale-75" />
            </div>
          </TooltipContent>
        </Tooltip>

        {/* Properties (toggle PropertiesPanel for current selection) */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              data-testid="toolbar-properties-toggle"
              variant={propertiesPanelOpen ? 'secondary' : 'ghost'}
              size="icon"
              className="w-9 h-9"
              disabled={!hasSelection}
              aria-pressed={propertiesPanelOpen}
              onClick={() => circuitActions.togglePropertiesPanel()}
            >
              <Info className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {propertiesPanelOpen ? 'Hide Properties' : 'Show Properties'}
            <span className="text-muted-foreground ml-2">I</span>
          </TooltipContent>
        </Tooltip>

        {/* Delete */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              data-testid="toolbar-delete-selected"
              variant="ghost"
              size="icon"
              className="w-9 h-9 text-muted-foreground hover:text-destructive"
              disabled={!hasSelection}
              onClick={handleDelete}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Delete Selected</TooltipContent>
        </Tooltip>

        {/* Clear */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              data-testid="toolbar-clear-all"
              variant="ghost"
              size="icon"
              className="w-9 h-9 text-muted-foreground hover:text-destructive"
              disabled={gatesCount === 0}
              onClick={() => circuitActions.clearCircuit()}
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Clear All</TooltipContent>
        </Tooltip>
      </div>

      {/* Bottom: theme picker, GitHub, settings, version */}
      <div className="flex flex-col items-center py-2 gap-1 border-t border-sidebar-border">
        <Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  data-testid="toolbar-theme-trigger"
                  variant="ghost"
                  size="icon"
                  className="w-9 h-9"
                >
                  {theme === 'dark' ? (
                    <Moon className="w-4 h-4" />
                  ) : theme === 'light' ? (
                    <Sun className="w-4 h-4" />
                  ) : (
                    <Monitor className="w-4 h-4" />
                  )}
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="right">Theme</TooltipContent>
          </Tooltip>
          <PopoverContent side="right" align="end" className="w-36 p-1">
            <div className="flex flex-col gap-0.5">
              {[
                { id: 'light', label: 'Light', Icon: Sun },
                { id: 'dark', label: 'Dark', Icon: Moon },
                { id: 'system', label: 'System', Icon: Monitor },
              ].map(({ id, label, Icon }) => (
                <Button
                  key={id}
                  data-testid={`toolbar-theme-${id}`}
                  variant={theme === id ? 'secondary' : 'ghost'}
                  size="sm"
                  className="justify-start gap-2 h-8"
                  onClick={() => setTheme(id)}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-xs">{label}</span>
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              data-testid="toolbar-github-link"
              variant="ghost"
              size="icon"
              className="w-9 h-9"
              asChild
            >
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

        <ComingSoon>
          <Button
            data-testid="toolbar-settings"
            variant="ghost"
            size="icon"
            className="w-9 h-9"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </ComingSoon>

        <div data-testid="toolbar-version" className="text-[10px] text-muted-foreground mt-1">
          {version}
        </div>
      </div>
    </div>
  )
}
