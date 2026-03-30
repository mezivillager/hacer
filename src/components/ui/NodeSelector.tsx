import { Tooltip, Button, Space, Segmented } from 'antd'
import {
  LoginOutlined,
  LogoutOutlined,
  ShareAltOutlined,
} from '@ant-design/icons'
import { useCircuitStore } from '@/store/circuitStore'
import type { NodePlacementType } from '@/store/types'
import { colors } from '@/theme'

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
    icon: <LoginOutlined />,
  },
  {
    type: 'OUTPUT',
    label: 'Output',
    description: 'Circuit output - displays computed result',
    icon: <LogoutOutlined />,
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
interface NodeSelectorProps {
  compact?: boolean
}

export function NodeSelector({ compact = false }: NodeSelectorProps) {
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

  if (compact) {
    return (
      <Space
        size="small"
        align="center"
        wrap={false}
        data-testid="node-compact-selector"
        className="node-selector-compact"
      >
        <Segmented
          size="small"
          value={nodePlacementMode ?? ''}
          options={NODE_TYPES.map((config) => ({
            label: config.label,
            value: config.type,
          }))}
          onChange={(value) => {
            handleNodeSelect(
              value as NodePlacementType,
              nodePlacementMode,
              startNodePlacement,
              cancelNodePlacement,
              cancelPlacement
            )
          }}
        />
        <Button
          size="small"
          data-testid="node-option-JUNCTION"
          type={junctionPlacementMode ? 'primary' : 'default'}
          icon={<ShareAltOutlined />}
          onClick={handleJunctionClick}
        >
          Junction
        </Button>
      </Space>
    )
  }

  return (
    <Space wrap size="small" className="node-selector">
      {NODE_TYPES.map((config) => {
        const isActive = nodePlacementMode === config.type

        return (
          <Tooltip key={config.type} title={config.description} placement="top">
            <Button
              type={isActive ? 'primary' : 'default'}
              icon={config.icon}
              onClick={() =>
                handleNodeSelect(
                  config.type,
                  nodePlacementMode,
                  startNodePlacement,
                  cancelNodePlacement,
                  cancelPlacement
                )
              }
              style={{
                borderColor: isActive ? colors.primary : undefined,
              }}
            >
              {config.label}
            </Button>
          </Tooltip>
        )
      })}
      <Tooltip title="Place junction on wire for branching" placement="top">
        <Button
          type={junctionPlacementMode ? 'primary' : 'default'}
          icon={<ShareAltOutlined />}
          onClick={handleJunctionClick}
          style={{
            borderColor: junctionPlacementMode ? colors.primary : undefined,
          }}
        >
          Junction
        </Button>
      </Tooltip>
    </Space>
  )
}
