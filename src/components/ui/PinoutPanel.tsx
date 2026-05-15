import { useState } from 'react'
import { useCircuitStore, circuitActions } from '@/store/circuitStore'
import { Button } from '@/components/ui-kit/button'
import { Separator } from '@/components/ui-kit/separator'

function inputsSignature(inputs: ReadonlyArray<{ id: string; value: number }>): string {
  return inputs.map(n => `${n.id}=${n.value}`).join('|')
}

export function PinoutPanel() {
  const inputNodes = useCircuitStore(state => state.inputNodes)
  const outputNodes = useCircuitStore(state => state.outputNodes)
  // `null` means "never evaluated" — initial render is dirty so the user can run the first eval.
  const [lastEvaluatedSignature, setLastEvaluatedSignature] = useState<string | null>(null)

  if (inputNodes.length === 0 && outputNodes.length === 0) {
    return null
  }

  const currentSignature = inputsSignature(inputNodes)
  const isDirty = lastEvaluatedSignature === null || lastEvaluatedSignature !== currentSignature

  const handleToggle = (nodeId: string, currentValue: number, width: number) => {
    if (width !== 1) return
    circuitActions.updateInputNodeValue(nodeId, currentValue ? 0 : 1)
  }

  const handleEval = () => {
    circuitActions.simulationTick()
    setLastEvaluatedSignature(currentSignature)
  }

  return (
    <div data-testid="pinout-panel" className="space-y-2">
      <div className="text-xs font-semibold">Chip I/O</div>
      <Separator />

      {inputNodes.length > 0 && (
        <div data-testid="pinout-inputs" className="space-y-1">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Inputs
          </div>
          {inputNodes.map(node => (
            <div
              key={node.id}
              data-testid={`pin-input-${node.name}`}
              className="flex items-center justify-between py-0.5"
            >
              <span className="text-xs">
                {node.name}
                {node.width > 1 ? `[${node.width}]` : ''}
              </span>
              <button
                type="button"
                data-testid={`pin-toggle-${node.name}`}
                onClick={() => handleToggle(node.id, node.value, node.width)}
                disabled={node.width !== 1}
                className="font-mono text-xs cursor-pointer hover:bg-accent disabled:cursor-default disabled:hover:bg-transparent rounded px-1.5 py-0.5"
              >
                {String(Number(node.value))}
              </button>
            </div>
          ))}
        </div>
      )}

      {outputNodes.length > 0 && (
        <div data-testid="pinout-outputs" className="space-y-1 pt-2">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Outputs
          </div>
          {outputNodes.map(node => (
            <div
              key={node.id}
              data-testid={`pin-output-${node.name}`}
              className="flex items-center justify-between py-0.5"
            >
              <span className="text-xs">
                {node.name}
                {node.width > 1 ? `[${node.width}]` : ''}
              </span>
              <span className="font-mono text-xs px-1.5 py-0.5">
                {String(Number(node.value))}
              </span>
            </div>
          ))}
        </div>
      )}

      <Button
        size="sm"
        variant="secondary"
        onClick={handleEval}
        disabled={!isDirty}
        data-testid="eval-button"
        className="w-full mt-2 cursor-pointer disabled:cursor-not-allowed"
      >
        Eval
      </Button>
    </div>
  )
}
