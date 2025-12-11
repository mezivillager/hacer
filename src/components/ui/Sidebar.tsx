import { Layout, Button, Space, Typography, Tooltip, Divider } from 'antd'
import {
  DeleteOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  ClearOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import { circuitActions, useCircuitStore } from '@/store/circuitStore'
import { colors } from '@/theme'
import { GateSelector } from './GateSelector'

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
  const circuit = useCircuitStore()
  const isPlacing = circuit.placementMode !== null

  const handleDeleteSelected = () => {
    if (circuit.selectedGateId) {
      circuitActions.removeGate(circuit.selectedGateId)
    }
  }

  const handleClearCircuit = () => {
    circuitActions.clearCircuit()
  }

  const handleToggleSimulation = () => {
    circuitActions.toggleSimulation()
  }

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
              Click on the grid to place the {circuit.placementMode} gate
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
              icon={circuit.simulationRunning ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
              onClick={handleToggleSimulation}
              block
            >
              {circuit.simulationRunning ? 'Pause Simulation' : 'Run Simulation'}
            </Button>
            <Tooltip title="Remove the selected gate">
              <Button
                icon={<DeleteOutlined />}
                onClick={handleDeleteSelected}
                disabled={!circuit.selectedGateId}
                block
                danger
              >
                Delete Selected
              </Button>
            </Tooltip>
            <Tooltip title="Remove all gates and wires">
              <Button
                icon={<ClearOutlined />}
                onClick={handleClearCircuit}
                disabled={circuit.gates.length === 0}
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
            <Text type="secondary">Gates: {circuit.gates.length}</Text>
            <Text type="secondary">Wires: {circuit.wires.length}</Text>
            <Text type="secondary">
              Status: {circuit.simulationRunning ? '▶ Running' : '⏸ Paused'}
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
