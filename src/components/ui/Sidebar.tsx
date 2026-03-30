import { useState } from 'react'
import { Layout, Button, Space, Typography, Tooltip, Divider, Switch, Collapse } from 'antd'
import {
  DeleteOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  ClearOutlined,
  SettingOutlined,
  GithubOutlined,
} from '@ant-design/icons'
import { circuitActions, useCircuitStore } from '@/store/circuitStore'
import { colors } from '@/theme'
import { GateSelector } from './GateSelector'
import { NodeSelector } from './NodeSelector'
import { NodeRenameControl } from './NodeRenameControl'
import { PinoutPanel } from './PinoutPanel'
import { handleDeleteSelected } from './handlers/uiHandlers'
import { useAppReleaseVersion } from '@/hooks/useAppReleaseVersion'

const { Sider } = Layout
const { Title, Text } = Typography

// Extracted styles using theme tokens
const styles = {
  title: { margin: 0, color: colors.text.primary },
  sectionTitle: { color: colors.text.primary, marginBottom: 8, display: 'block' as const },
  fullWidth: { width: '100%' },
  hint: { fontSize: 11, color: colors.primary },
  smallText: { fontSize: 11 },
}

export function Sidebar() {
  const [activeSection, setActiveSection] = useState<string>('build')

  // Use selectors for granular subscriptions
  const placementMode = useCircuitStore((s) => s.placementMode)
  const nodePlacementMode = useCircuitStore((s) => s.nodePlacementMode)
  const selectedGateId = useCircuitStore((s) => s.selectedGateId)
  const selectedWireId = useCircuitStore((s) => s.selectedWireId)
  const selectedNodeId = useCircuitStore((s) => s.selectedNodeId)
  const simulationRunning = useCircuitStore((s) => s.simulationRunning)
  const gatesCount = useCircuitStore((s) => s.gates.length)
  const wiresCount = useCircuitStore((s) => s.wires.length)
  const inputNodesCount = useCircuitStore((s) => s.inputNodes.length)
  const outputNodesCount = useCircuitStore((s) => s.outputNodes.length)

  const selectedNodeType = useCircuitStore((s) => s.selectedNodeType)

  // Get actions from store
  const removeGate = useCircuitStore((s) => s.removeGate)
  const removeWire = useCircuitStore((s) => s.removeWire)
  const removeInputNode = useCircuitStore((s) => s.removeInputNode)
  const removeOutputNode = useCircuitStore((s) => s.removeOutputNode)
  const clearCircuit = useCircuitStore((s) => s.clearCircuit)
  const toggleSimulation = useCircuitStore((s) => s.toggleSimulation)
  const toggleAxes = useCircuitStore((s) => s.toggleAxes)
  const showAxes = useCircuitStore((s) => s.showAxes)

  const isPlacing = placementMode !== null
  const isPlacingNode = nodePlacementMode !== null
  const hasSelection = selectedGateId !== null || selectedWireId !== null || selectedNodeId !== null

  const appVersion = useAppReleaseVersion()

  const sectionItems = [
    {
      key: 'build',
      label: <span data-testid="sidebar-section-header-build">Build</span>,
      children: (
        <div data-testid="sidebar-section-build">
          <Text strong style={styles.sectionTitle}>
            Elementary Gates
          </Text>
          <GateSelector compact />
          {isPlacing && (
            <Text style={styles.hint} className="placement-hint">
              Click on the grid to place the {placementMode} gate
            </Text>
          )}

          <Divider className="sider-divider" />

          <Text strong style={styles.sectionTitle}>
            Circuit I/O
          </Text>
          <NodeSelector compact />
          {isPlacingNode && (
            <Text style={styles.hint} className="placement-hint">
              Click on the grid to place the node
            </Text>
          )}
          <NodeRenameControl />
        </div>
      ),
    },
    {
      key: 'controls',
      label: <span data-testid="sidebar-section-header-controls">Controls</span>,
      children: (
        <div data-testid="sidebar-section-controls">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text type="secondary">Show Axes</Text>
            <Switch checked={showAxes} onChange={toggleAxes} />
          </div>
        </div>
      ),
    },
    {
      key: 'io',
      label: <span data-testid="sidebar-section-header-io">Chip I/O</span>,
      children: (
        <div data-testid="sidebar-section-io">
          <PinoutPanel compact />
        </div>
      ),
    },
    {
      key: 'info',
      label: <span data-testid="sidebar-section-header-info">Circuit Info</span>,
      children: (
        <div data-testid="sidebar-section-info">
          <Space direction="vertical" size={2}>
            <Text type="secondary">Gates: {gatesCount}</Text>
            <Text type="secondary">Wires: {wiresCount}</Text>
            <Text type="secondary">Inputs: {inputNodesCount}</Text>
            <Text type="secondary">Outputs: {outputNodesCount}</Text>
            <Text type="secondary">
              Status: {simulationRunning ? '▶ Running' : '⏸ Paused'}
            </Text>
          </Space>
        </div>
      ),
    },
  ]

  return (
    <Sider width={260} className="app-sider">
      <div className="sider-content">
        <div className="sider-header">
          <div className="sider-title-row">
            <Title level={4} style={styles.title}>
              🔌 HACER
            </Title>
            <Button
              icon={<GithubOutlined />}
              href="https://github.com/mezivillager/hacer"
              target="_blank"
              rel="noopener noreferrer"
              size="small"
              className="github-link"
            >
              GitHub
            </Button>
          </div>
          <Text type="secondary" className="sider-header-desc">
            Hardware Architecture & Constraints Explorer/Researcher
          </Text>
        </div>

        <Divider className="sider-divider" />

        <div className="sidebar-quick-actions" data-testid="sidebar-quick-actions">
          <Button
            data-testid="quick-action-run-pause"
            icon={simulationRunning ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
            onClick={toggleSimulation}
            size="small"
          >
            {simulationRunning ? 'Pause Simulation' : 'Run Simulation'}
          </Button>
          <Button
            data-testid="quick-action-eval"
            onClick={() => circuitActions.simulationTick()}
            size="small"
          >
            Eval
          </Button>
          <Button
            data-testid="quick-action-io"
            onClick={() => setActiveSection('io')}
            size="small"
          >
            Chip I/O
          </Button>
          <Tooltip title="Remove the selected gate, wire, or node">
            <Button
              icon={<DeleteOutlined />}
              onClick={() => handleDeleteSelected(
                selectedGateId,
                selectedWireId,
                selectedNodeId,
                selectedNodeType,
                removeGate,
                removeWire,
                removeInputNode,
                removeOutputNode
              )}
              data-testid="quick-action-delete"
              disabled={!hasSelection}
              size="small"
              danger
            >
              Delete Selected
            </Button>
          </Tooltip>
          <Tooltip title="Remove all gates and wires">
            <Button
              icon={<ClearOutlined />}
              onClick={clearCircuit}
              data-testid="quick-action-clear"
              disabled={gatesCount === 0}
              size="small"
            >
              Clear All
            </Button>
          </Tooltip>
        </div>

        <div className="sidebar-scroll-region">
          <Collapse
            accordion
            activeKey={activeSection}
            onChange={(key) => {
              if (Array.isArray(key)) {
                setActiveSection(key[0] ?? 'build')
                return
              }

              setActiveSection(key || 'build')
            }}
            items={sectionItems}
          />
        </div>

        <div className="sider-footer">
          <Tooltip title="Settings (coming soon)">
            <Button icon={<SettingOutlined />} type="text" size="small" />
          </Tooltip>
          <Text type="secondary" style={styles.smallText}>
            {appVersion}
          </Text>
        </div>
      </div>
    </Sider>
  )
}
