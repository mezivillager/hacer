import { Tooltip, Button, Space } from 'antd'
import {
  LoginOutlined,
  LogoutOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
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
    description: 'Circuit input - toggleable external signal',
    icon: <LoginOutlined />,
  },
  {
    type: 'OUTPUT',
    label: 'Output',
    description: 'Circuit output - displays computed result',
    icon: <LogoutOutlined />,
  },
  {
    type: 'CONSTANT_TRUE',
    label: '1',
    description: 'Constant TRUE (1) - always outputs high signal',
    icon: <CheckCircleOutlined />,
  },
  {
    type: 'CONSTANT_FALSE',
    label: '0',
    description: 'Constant FALSE (0) - always outputs low signal',
    icon: <CloseCircleOutlined />,
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
  const startNodePlacement = useCircuitStore((s) => s.startNodePlacement)
  const cancelNodePlacement = useCircuitStore((s) => s.cancelNodePlacement)
  const cancelPlacement = useCircuitStore((s) => s.cancelPlacement)

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
    </Space>
  )
}
