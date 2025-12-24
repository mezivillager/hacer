import { Layout, Button, Space, Typography, Tooltip, Divider, Switch } from 'antd'
import {
  DeleteOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  ClearOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import { useCircuitStore } from '@/store/circuitStore'
import { colors } from '@/theme'
import { GateSelector } from './GateSelector'
import { handleDeleteSelected } from './handlers/uiHandlers'

const { Sider } = Layout
const { Title, Text } = Typography

// Extracted styles using theme tokens
const styles = {
  title: { margin: 0, color: colors.text.primary },
  divider: { margin: '12px 0' },
  sectionTitle: { color: colors.text.primary, marginBottom: 8, display: 'block' as const },
  fullWidth: { width: '100%' },
  hint: { fontSize: 11, color: colors.primary },
  smallText: { fontSize: 11 },
}

export function Sidebar() {
  // Use selectors for granular subscriptions
  const placementMode = useCircuitStore((s) => s.placementMode)
  const selectedGateId = useCircuitStore((s) => s.selectedGateId)
  const simulationRunning = useCircuitStore((s) => s.simulationRunning)
  const gatesCount = useCircuitStore((s) => s.gates.length)
  const wiresCount = useCircuitStore((s) => s.wires.length)

  // Get actions from store
  const removeGate = useCircuitStore((s) => s.removeGate)
  const clearCircuit = useCircuitStore((s) => s.clearCircuit)
  const toggleSimulation = useCircuitStore((s) => s.toggleSimulation)
  const toggleAxes = useCircuitStore((s) => s.toggleAxes)
  const showAxes = useCircuitStore((s) => s.showAxes)

  const isPlacing = placementMode !== null

  return (
    <Sider width={260} className="app-sider">
      <div className="sider-content">
        <div className="sider-header">
          <Title level={4} style={styles.title}>
            🔌 Nand2Fun
          </Title>
          <Text type="secondary">Logic Gate Simulator</Text>
        </div>

        <Divider style={styles.divider} />

        <div className="sider-section">
          <Text strong style={styles.sectionTitle}>
            Elementary Gates
          </Text>
          <GateSelector />
          {isPlacing && (
            <Text style={styles.hint} className="placement-hint">
              Click on the grid to place the {placementMode} gate
            </Text>
          )}
        </div>

        <Divider style={styles.divider} />

        <div className="sider-section">
          <Text strong style={styles.sectionTitle}>
            Controls
          </Text>
          <Space direction="vertical" style={styles.fullWidth}>
            <Button
              icon={simulationRunning ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
              onClick={toggleSimulation}
              block
            >
              {simulationRunning ? 'Pause Simulation' : 'Run Simulation'}
            </Button>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text type="secondary">Show Axes</Text>
              <Switch checked={showAxes} onChange={toggleAxes} />
            </div>
            <Tooltip title="Remove the selected gate">
              <Button
                icon={<DeleteOutlined />}
                onClick={() => handleDeleteSelected(selectedGateId, removeGate)}
                disabled={!selectedGateId}
                block
                danger
              >
                Delete Selected
              </Button>
            </Tooltip>
            <Tooltip title="Remove all gates and wires">
              <Button
                icon={<ClearOutlined />}
                onClick={clearCircuit}
                disabled={gatesCount === 0}
                block
              >
                Clear All
              </Button>
            </Tooltip>
          </Space>
        </div>

        <Divider style={styles.divider} />

        <div className="sider-section">
          <Text strong style={styles.sectionTitle}>
            Circuit Info
          </Text>
          <Space direction="vertical" size={2}>
            <Text type="secondary">Gates: {gatesCount}</Text>
            <Text type="secondary">Wires: {wiresCount}</Text>
            <Text type="secondary">
              Status: {simulationRunning ? '▶ Running' : '⏸ Paused'}
            </Text>
          </Space>
        </div>

        <div className="sider-footer">
          <Tooltip title="Settings (coming soon)">
            <Button icon={<SettingOutlined />} type="text" />
          </Tooltip>
          <Text type="secondary" style={styles.smallText}>
            v0.1.0 • nand2tetris inspired
          </Text>
        </div>
      </div>
    </Sider>
  )
}
