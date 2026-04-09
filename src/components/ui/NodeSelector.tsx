import { ArrowRightToLine, ArrowLeftFromLine, GitBranch } from 'lucide-react'
import { Button, Tooltip, TooltipTrigger, TooltipContent } from './shadcn'
import { useCircuitStore } from '@/store/circuitStore'
import type { NodePlacementType } from '@/store/types'

/**
 * Node type configuration for the selector.
 */
interface NodeTypeConfig {
  type: NodePlacementType
  label: string
  description: string
  icon: React.ReactNode
}

/**
 * Node types to show in the selector.
 */
const NODE_TYPES: NodeTypeConfig[] = [
  {
    type: 'INPUT',
    label: 'Input',
    description: 'Circuit input - click to select, Shift+click to toggle signal value',
    icon: <ArrowRightToLine className="size-4" />,
  },
  {
    type: 'OUTPUT',
    label: 'Output',
    description: 'Circuit output - displays computed result',
    icon: <ArrowLeftFromLine className="size-4" />,
  },
]

/**
 * Handle node type selection - toggle placement mode.
 */
function handleNodeSelect(
  type: NodePlacementType,
  currentMode: NodePlacementType | null,
  startNodePlacement: (type: NodePlacementType) => void,
  cancelNodePlacement: () => void,
  cancelPlacement: () => void
): void {
  // Cancel any gate placement first
  cancelPlacement()

  if (currentMode === type) {
    // Clicking same type again cancels placement
    cancelNodePlacement()
  } else {
    // Start placement for this node type
    startNodePlacement(type)
  }
}

/**
 * NodeSelector component - buttons to select circuit I/O node types for placement.
 */
export function NodeSelector() {
  const nodePlacementMode = useCircuitStore((s) => s.nodePlacementMode)
  const junctionPlacementMode = useCircuitStore((s) => s.junctionPlacementMode)
  const startNodePlacement = useCircuitStore((s) => s.startNodePlacement)
  const cancelNodePlacement = useCircuitStore((s) => s.cancelNodePlacement)
  const cancelPlacement = useCircuitStore((s) => s.cancelPlacement)
  const startJunctionPlacement = useCircuitStore((s) => s.startJunctionPlacement)
  const cancelJunctionPlacement = useCircuitStore((s) => s.cancelJunctionPlacement)

  const handleJunctionClick = () => {
    cancelPlacement()
    if (junctionPlacementMode) {
      cancelJunctionPlacement()
    } else {
      startJunctionPlacement()
    }
  }

  return (
    <div className="node-selector flex flex-wrap gap-2">
      {NODE_TYPES.map((config) => {
        const isActive = nodePlacementMode === config.type

        return (
          <Tooltip key={config.type}>
            <TooltipTrigger asChild>
              <Button
                variant={isActive ? 'default' : 'outline'}
                onClick={() =>
                  handleNodeSelect(
                    config.type,
                    nodePlacementMode,
                    startNodePlacement,
                    cancelNodePlacement,
                    cancelPlacement
                  )
                }
              >
                {config.icon}
                {config.label}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">{config.description}</TooltipContent>
          </Tooltip>
        )
      })}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={junctionPlacementMode ? 'default' : 'outline'}
            onClick={handleJunctionClick}
          >
            <GitBranch className="size-4" />
            Junction
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">Place junction on wire for branching</TooltipContent>
      </Tooltip>
    </div>
  )
}
