import { useState } from 'react'
import { useCircuitStore, circuitActions } from '@/store/circuitStore'
import { Button } from '@/components/ui-kit/button'
import { Separator } from '@/components/ui-kit/separator'
import { MultiBitInput } from './MultiBitInput'

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

  const handleToggle = (nodeId: string, currentValue: number) => {
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
              {node.width === 1 ? (
                <button
                  type="button"
                  data-testid={`pin-toggle-${node.name}`}
                  onClick={() => handleToggle(node.id, node.value)}
                  className="font-mono text-xs cursor-pointer hover:bg-accent disabled:cursor-default disabled:hover:bg-transparent rounded px-1.5 py-0.5"
                >
                  {String(Number(node.value))}
                </button>
              ) : (
                <MultiBitInput
                  nodeId={node.id}
                  currentValue={node.value}
                  width={node.width}
                  onValueChange={(id, v) => circuitActions.updateInputNodeValue(id, v)}
                />
              )}
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
              {node.width === 1 ? (
                <span className="font-mono text-xs px-1.5 py-0.5">
                  {String(Number(node.value))}
                </span>
              ) : (
                <MultiBitInput
                  nodeId={node.id}
                  currentValue={node.value}
                  width={node.width}
                  onValueChange={() => {}}
                  readOnly
                />
              )}
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
