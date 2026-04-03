import { useState } from 'react'
import { notify } from '@lib/toast'
import { Button, Input } from './shadcn'
import { circuitActions, useCircuitStore } from '@/store/circuitStore'
import { validateNodeName, type NodeNameValidationReason } from '@/utils/nodeNameValidation'

function reasonToMessage(reason: NodeNameValidationReason): string {
  switch (reason) {
    case 'empty':
      return 'Node name is required.'
    case 'invalid-format':
      return 'Use an HDL-safe name: start with a letter/underscore, then letters, numbers, or underscore.'
    case 'duplicate':
      return 'Node name must be unique within the same input/output group.'
  }
}

export function NodeRenameControl() {
  const selectedNodeId = useCircuitStore((state) => state.selectedNodeId)
  const selectedNodeType = useCircuitStore((state) => state.selectedNodeType)
  const inputNodes = useCircuitStore((state) => state.inputNodes)
  const outputNodes = useCircuitStore((state) => state.outputNodes)

  const selectedNode = selectedNodeType === 'input'
    ? inputNodes.find((node) => node.id === selectedNodeId)
    : selectedNodeType === 'output'
      ? outputNodes.find((node) => node.id === selectedNodeId)
      : undefined

  const [draftNamesByNodeId, setDraftNamesByNodeId] = useState<Record<string, string>>({})

  if (!selectedNode || !selectedNodeType) {
    return null
  }

  const draftName = draftNamesByNodeId[selectedNode.id] ?? selectedNode.name

  const existingNames = selectedNodeType === 'input'
    ? inputNodes.map((node) => node.name)
    : outputNodes.map((node) => node.name)

  const handleApply = () => {
    const validation = validateNodeName(draftName, existingNames, selectedNode.name)
    if (!validation.ok) {
      notify.error(reasonToMessage(validation.reason))
      return
    }

    if (selectedNodeType === 'input') {
      circuitActions.renameInputNode(selectedNode.id, validation.normalizedName)
    } else {
      circuitActions.renameOutputNode(selectedNode.id, validation.normalizedName)
    }

    setDraftNamesByNodeId((current) => ({
      ...current,
      [selectedNode.id]: validation.normalizedName,
    }))
  }

  return (
    <div className="mt-2.5 p-2 border border-border rounded-lg bg-white/[0.03] flex flex-col gap-2" data-testid="node-rename-control">
      <span className="text-sm font-semibold text-foreground">Rename Selected Node</span>
      <div className="w-full flex">
        <Input
          value={draftName}
          onChange={(event) => {
            const nextValue = event.target.value
            setDraftNamesByNodeId((current) => ({
              ...current,
              [selectedNode.id]: nextValue,
            }))
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              handleApply()
            }
          }}
          placeholder="Node name"
          data-testid="node-rename-input"
          className="flex-1 h-8 text-sm rounded-r-none"
        />
        <Button
          size="sm"
          onClick={handleApply}
          data-testid="node-rename-apply"
          className="rounded-l-none"
        >
          Apply
        </Button>
      </div>
    </div>
  )
}
