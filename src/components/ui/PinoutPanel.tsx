import { Button, Divider } from 'antd'
import { circuitActions, useCircuitStore } from '@/store/circuitStore'

export function PinoutPanel() {
  const inputNodes = useCircuitStore((state) => state.inputNodes)
  const outputNodes = useCircuitStore((state) => state.outputNodes)

  const handleToggle = (nodeId: string, currentValue: number) => {
    const newValue = currentValue ? 0 : 1
    circuitActions.updateInputNodeValue(nodeId, newValue)
  }

  const handleEval = () => {
    circuitActions.simulationTick()
  }

  if (inputNodes.length === 0 && outputNodes.length === 0) {
    return null
  }

  return (
    <div data-testid="pinout-panel" style={{ padding: '8px 0' }}>
      <Divider style={{ margin: '8px 0', fontSize: 12 }}>Chip I/O</Divider>

      {inputNodes.length > 0 && (
        <div data-testid="pinout-inputs">
          <div style={{ fontWeight: 600, fontSize: 11, marginBottom: 4, color: '#888' }}>INPUTS</div>
          {inputNodes.map((node) => (
            <div
              key={node.id}
              data-testid={`pin-input-${node.name}`}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 0' }}
            >
              <span style={{ fontSize: 12 }}>
                {node.name}
                {node.width > 1 ? `[${node.width}]` : ''}
              </span>
              <span
                style={{ cursor: node.width === 1 ? 'pointer' : 'default', fontFamily: 'monospace', fontSize: 12 }}
                onClick={() => node.width === 1 && handleToggle(node.id, node.value)}
                data-testid={`pin-toggle-${node.name}`}
              >
                {String(Number(node.value))}
              </span>
            </div>
          ))}
        </div>
      )}

      {outputNodes.length > 0 && (
        <div data-testid="pinout-outputs">
          <div style={{ fontWeight: 600, fontSize: 11, marginBottom: 4, marginTop: 8, color: '#888' }}>OUTPUTS</div>
          {outputNodes.map((node) => (
            <div
              key={node.id}
              data-testid={`pin-output-${node.name}`}
              style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}
            >
              <span style={{ fontSize: 12 }}>
                {node.name}
                {node.width > 1 ? `[${node.width}]` : ''}
              </span>
              <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{String(Number(node.value))}</span>
            </div>
          ))}
        </div>
      )}

      <Button size="small" onClick={handleEval} style={{ marginTop: 8, width: '100%' }} data-testid="eval-button">
        Eval
      </Button>
    </div>
  )
}