import { useEffect } from 'react'
import { ConfigProvider, Layout, theme, Button, Space, Typography, Tooltip, Divider } from 'antd'
import {
  PlusOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  ClearOutlined,
  SettingOutlined,
  CloseOutlined,
} from '@ant-design/icons'
import { Scene } from './components/canvas/Scene'
import { NandGate } from './gates/NandGate'
import { Wire3D } from './components/canvas/Wire3D'
import { circuitActions, useCircuitStore } from './store/circuitStore'
import './App.css'

const { Sider, Content } = Layout
const { Title, Text } = Typography

function App() {
  const circuit = useCircuitStore()
  const isPlacing = circuit.placementMode !== null
  const isWiring = circuit.wiringFrom !== null
  
  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle keyboard shortcuts when typing in inputs or when in placement/wiring mode
      if (isPlacing || isWiring) {
        if (e.key === 'Escape') {
          if (isPlacing) circuitActions.cancelPlacement()
          if (isWiring) circuitActions.cancelWiring()
        }
        return
      }
      
      // Escape key
      if (e.key === 'Escape') {
        circuitActions.selectGate(null)
        return
      }
      
      // Arrow keys for rotating selected gate (left/right only)
      if (!circuit.selectedGateId) return
      
      const rotationStep = Math.PI / 4 // 45 degrees
      
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          circuitActions.rotateGate(circuit.selectedGateId, 'y', rotationStep)
          break
        case 'ArrowRight':
          e.preventDefault()
          circuitActions.rotateGate(circuit.selectedGateId, 'y', -rotationStep)
          break
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isPlacing, isWiring, circuit.selectedGateId])
  
  // Helper to check if a pin is connected
  const isPinConnected = (gateId: string, pinId: string) => {
    return circuit.wires.some(
      w => (w.fromGateId === gateId && w.fromPinId === pinId) ||
           (w.toGateId === gateId && w.toPinId === pinId)
    )
  }
  
  // Handle pin clicks for wiring
  const handlePinClick = (gateId: string, pinId: string, pinType: 'input' | 'output', worldPosition: { x: number; y: number; z: number }) => {
    if (isWiring) {
      // Complete wiring
      circuitActions.completeWiring(gateId, pinId, pinType)
    } else {
      // Start wiring
      circuitActions.startWiring(gateId, pinId, pinType, worldPosition)
    }
  }
  
  // Handle input toggle (Alt+click on unconnected input)
  const handleInputToggle = (gateId: string, pinId: string) => {
    const gate = circuit.gates.find(g => g.id === gateId)
    if (gate) {
      const pin = gate.inputs.find(p => p.id === pinId)
      if (pin) {
        circuitActions.setInputValue(gateId, pinId, !pin.value)
      }
    }
  }
  
  // Get wire endpoints for rendering
  const getWireEndpoints = (wire: typeof circuit.wires[0]) => {
    const fromPos = circuitActions.getPinWorldPosition(wire.fromGateId, wire.fromPinId)
    const toPos = circuitActions.getPinWorldPosition(wire.toGateId, wire.toPinId)
    return { fromPos, toPos }
  }
  
  const handleAddNandGate = () => {
    if (isPlacing) {
      circuitActions.cancelPlacement()
    } else {
      circuitActions.startPlacement('NAND')
    }
  }
  
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
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#4a9eff',
          borderRadius: 6,
        },
      }}
    >
      <Layout className="app-layout">
        <Sider width={260} className="app-sider">
          <div className="sider-content">
            <div className="sider-header">
              <Title level={4} style={{ margin: 0, color: '#fff' }}>
                🔌 Nand2Fun
              </Title>
              <Text type="secondary">Logic Gate Simulator</Text>
            </div>
            
            <Divider style={{ margin: '12px 0' }} />
            
            <div className="sider-section">
              <Text strong style={{ color: '#fff', marginBottom: 8, display: 'block' }}>
                Add Gates
              </Text>
              <Space orientation="vertical" style={{ width: '100%' }}>
                <Button
                  type={circuit.placementMode === 'NAND' ? 'default' : 'primary'}
                  icon={circuit.placementMode === 'NAND' ? <CloseOutlined /> : <PlusOutlined />}
                  onClick={handleAddNandGate}
                  block
                  danger={circuit.placementMode === 'NAND'}
                >
                  {circuit.placementMode === 'NAND' ? 'Cancel Placement' : 'Add NAND Gate'}
                </Button>
                {isPlacing && (
                  <Text style={{ fontSize: 11, color: '#4a9eff' }}>
                    Click on the grid to place the gate
                  </Text>
                )}
                {!isPlacing && (
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    More gates coming soon: AND, OR, NOT, XOR...
                  </Text>
                )}
              </Space>
            </div>
            
            <Divider style={{ margin: '12px 0' }} />
            
            <div className="sider-section">
              <Text strong style={{ color: '#fff', marginBottom: 8, display: 'block' }}>
                Controls
              </Text>
              <Space orientation="vertical" style={{ width: '100%' }}>
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
            
            <Divider style={{ margin: '12px 0' }} />
            
            <div className="sider-section">
              <Text strong style={{ color: '#fff', marginBottom: 8, display: 'block' }}>
                Circuit Info
              </Text>
              <Space orientation="vertical" size={2}>
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
              <Text type="secondary" style={{ fontSize: 11 }}>
                v0.1.0 • nand2tetris inspired
              </Text>
            </div>
          </div>
        </Sider>
        
        <Content className={`app-content ${isPlacing ? 'placing' : ''} ${isWiring ? 'wiring' : ''}`}>
          <Scene>
            {/* Render all wires */}
            {circuit.wires.map((wire) => {
              const { fromPos, toPos } = getWireEndpoints(wire)
              if (!fromPos || !toPos) return null
              
              // Get the output value for wire color
              const fromGate = circuit.gates.find(g => g.id === wire.fromGateId)
              const outputValue = fromGate?.outputs.find(p => p.id === wire.fromPinId)?.value ?? false
              
              return (
                <Wire3D
                  key={wire.id}
                  start={fromPos}
                  end={toPos}
                  isActive={outputValue}
                />
              )
            })}
            
            {/* Render all gates */}
            {circuit.gates.map((gate) => (
              <NandGate
                key={gate.id}
                id={gate.id}
                position={[gate.position.x, gate.position.y, gate.position.z]}
                rotation={[gate.rotation.x, gate.rotation.y, gate.rotation.z]}
                selected={gate.selected}
                inputA={gate.inputs[0]?.value ?? false}
                inputB={gate.inputs[1]?.value ?? false}
                inputAConnected={isPinConnected(gate.id, `${gate.id}-in-0`)}
                inputBConnected={isPinConnected(gate.id, `${gate.id}-in-1`)}
                outputConnected={isPinConnected(gate.id, `${gate.id}-out-0`)}
                isWiring={isWiring}
                onClick={() => !isWiring && circuitActions.selectGate(gate.id)}
                onPinClick={handlePinClick}
                onInputToggle={handleInputToggle}
              />
            ))}
          </Scene>
          
          {/* Help overlay */}
          <div className="help-overlay">
            <Text type="secondary">
              {isPlacing 
                ? '📍 Click anywhere on the grid to place the gate • Press Esc to cancel'
                : isWiring
                ? '🔗 Click on another pin to connect • Click empty space or Esc to cancel'
                : '🖱️ Click pin: Wire • Shift+click input: Toggle • Click body: Select • Left/Right arrows: Rotate gate • Scroll: Zoom'
              }
            </Text>
          </div>
        </Content>
      </Layout>
    </ConfigProvider>
  )
}

export default App
