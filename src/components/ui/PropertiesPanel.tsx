import { useState, useRef } from 'react'
import {
  X,
  Trash2,
  RotateCw,
  Tag,
  SlidersHorizontal,
} from 'lucide-react'
import { cn } from '@lib/utils'
import {
  Button,
  Input,
  Label,
  Separator,
  Switch,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from './shadcn'
import { useCircuitStore } from '@/store/circuitStore'
import type { GateInstance, Wire, InputNode, OutputNode } from '@/store/types'

type SelectedElement =
  | { kind: 'gate'; gate: GateInstance }
  | { kind: 'wire'; wire: Wire }
  | { kind: 'input'; node: InputNode }
  | { kind: 'output'; node: OutputNode }

/** Derive the currently selected element from store state. */
function useSelectedElement(): SelectedElement | null {
  const selectedGateId = useCircuitStore((s) => s.selectedGateId)
  const selectedWireId = useCircuitStore((s) => s.selectedWireId)
  const selectedNodeId = useCircuitStore((s) => s.selectedNodeId)
  const selectedNodeType = useCircuitStore((s) => s.selectedNodeType)

  const gate = useCircuitStore((s) =>
    selectedGateId ? s.gates.find((g) => g.id === selectedGateId) ?? null : null,
  )
  const wire = useCircuitStore((s) =>
    selectedWireId ? s.wires.find((w) => w.id === selectedWireId) ?? null : null,
  )
  const inputNode = useCircuitStore((s) =>
    selectedNodeId && selectedNodeType === 'input'
      ? s.inputNodes.find((n) => n.id === selectedNodeId) ?? null
      : null,
  )
  const outputNode = useCircuitStore((s) =>
    selectedNodeId && selectedNodeType === 'output'
      ? s.outputNodes.find((n) => n.id === selectedNodeId) ?? null
      : null,
  )

  if (gate) return { kind: 'gate', gate }
  if (wire) return { kind: 'wire', wire }
  if (inputNode) return { kind: 'input', node: inputNode }
  if (outputNode) return { kind: 'output', node: outputNode }
  return null
}

function getTypeLabel(element: SelectedElement): string {
  switch (element.kind) {
    case 'gate':
      return element.gate.type
    case 'wire':
      return 'Wire'
    case 'input':
      return 'Input'
    case 'output':
      return 'Output'
  }
}

function getElementName(element: SelectedElement): string {
  switch (element.kind) {
    case 'gate':
      return `${element.gate.type} ${element.gate.id.slice(-4)}`
    case 'wire':
      return `Wire ${element.wire.id.slice(-4)}`
    case 'input':
      return element.node.name
    case 'output':
      return element.node.name
  }
}

function formatEndpoint(ep: Wire['from']): string {
  if (ep.type === 'gate' && ep.pinId) return `${ep.entityId.slice(-4)}.${ep.pinId}`
  if (ep.type === 'junction') return `J:${ep.entityId.slice(-4)}`
  return `${ep.type}:${ep.entityId.slice(-4)}`
}

export function PropertiesPanel() {
  const element = useSelectedElement()
  const [localName, setLocalName] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  // Track which element the localName corresponds to, for resetting on selection change
  const prevElementRef = useRef<string | null>(null)

  // Actions
  const removeGate = useCircuitStore((s) => s.removeGate)
  const removeWire = useCircuitStore((s) => s.removeWire)
  const removeInputNode = useCircuitStore((s) => s.removeInputNode)
  const removeOutputNode = useCircuitStore((s) => s.removeOutputNode)
  const rotateGate = useCircuitStore((s) => s.rotateGate)
  const renameInputNode = useCircuitStore((s) => s.renameInputNode)
  const renameOutputNode = useCircuitStore((s) => s.renameOutputNode)
  const updateInputNodeValue = useCircuitStore((s) => s.updateInputNodeValue)
  const deselectAll = useCircuitStore((s) => s.deselectAll)

  // Derive a stable identity key from element
  const elementKey = element
    ? element.kind === 'gate'
      ? element.gate.id
      : element.kind === 'wire'
        ? element.wire.id
        : element.node.id
    : null

  // Reset local editing state when the selected element changes
  if (elementKey !== prevElementRef.current) {
    prevElementRef.current = elementKey
    if (element) {
      setLocalName(getElementName(element))
    }
    setIsEditing(false)
  }

  if (!element) return null

  const handleClose = () => {
    deselectAll()
  }

  const handleDelete = () => {
    switch (element.kind) {
      case 'gate':
        removeGate(element.gate.id)
        break
      case 'wire':
        removeWire(element.wire.id)
        break
      case 'input':
        removeInputNode(element.node.id)
        break
      case 'output':
        removeOutputNode(element.node.id)
        break
    }
  }

  const handleNameCommit = () => {
    if (element.kind === 'input' && localName !== element.node.name) {
      renameInputNode(element.node.id, localName)
    } else if (element.kind === 'output' && localName !== element.node.name) {
      renameOutputNode(element.node.id, localName)
    }
    setIsEditing(false)
  }

  const handleRotate = () => {
    if (element.kind === 'gate') {
      rotateGate(element.gate.id, 'z', Math.PI / 2)
    }
  }

  const handleDefaultValueToggle = () => {
    if (element.kind === 'input') {
      updateInputNodeValue(element.node.id, element.node.value === 0 ? 1 : 0)
    }
  }

  const isRenameable = element.kind === 'input' || element.kind === 'output'

  return (
    <div
      className="absolute bottom-16 left-1/2 -translate-x-1/2 w-[400px] bg-card border border-border rounded-lg shadow-xl overflow-hidden animate-in slide-in-from-bottom-4 duration-200"
      data-testid="properties-panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-secondary/30 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {getTypeLabel(element)}
            </span>
          </div>
          <Separator orientation="vertical" className="h-4" />
          {isEditing && isRenameable ? (
            <Input
              ref={inputRef}
              value={localName}
              onChange={(e) => setLocalName(e.target.value)}
              onBlur={handleNameCommit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleNameCommit()
                if (e.key === 'Escape') {
                  setLocalName(getElementName(element))
                  setIsEditing(false)
                }
              }}
              className="h-6 w-32 text-sm px-1.5"
              autoFocus
              data-testid="properties-name-input"
            />
          ) : (
            <button
              onClick={() => {
                if (isRenameable) {
                  setIsEditing(true)
                  setTimeout(() => inputRef.current?.select(), 0)
                }
              }}
              className={cn(
                'text-sm font-medium transition-colors',
                isRenameable && 'hover:text-primary cursor-pointer',
              )}
              data-testid="properties-name-display"
            >
              {getElementName(element)}
            </button>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7 text-destructive hover:text-destructive"
                onClick={handleDelete}
                data-testid="properties-delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete (Del)</TooltipContent>
          </Tooltip>
          <Separator orientation="vertical" className="h-4 mx-1" />
          <Button
            variant="ghost"
            size="icon"
            className="w-7 h-7"
            onClick={handleClose}
            data-testid="properties-close"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Properties Grid */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Label/Display Name for I/O nodes */}
          {(element.kind === 'input' || element.kind === 'output') && (
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <Tag className="w-3 h-3" />
                Display Label
              </Label>
              <Input
                value={localName}
                onChange={(e) => setLocalName(e.target.value)}
                onBlur={handleNameCommit}
                placeholder="e.g., A, B, CLK, OUT"
                className="h-8 text-sm"
                data-testid="properties-label-input"
              />
            </div>
          )}

          {/* Position (read-only) */}
          {element.kind !== 'wire' && (
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <SlidersHorizontal className="w-3 h-3" />
                Position
              </Label>
              <div className="flex gap-2">
                <div className="flex-1 h-8 px-2.5 rounded-md bg-secondary/50 border border-border flex items-center">
                  <span className="text-xs text-muted-foreground mr-1">X</span>
                  <span className="text-sm tabular-nums" data-testid="properties-pos-x">
                    {element.kind === 'gate'
                      ? element.gate.position.x
                      : element.node.position.x}
                  </span>
                </div>
                <div className="flex-1 h-8 px-2.5 rounded-md bg-secondary/50 border border-border flex items-center">
                  <span className="text-xs text-muted-foreground mr-1">Y</span>
                  <span className="text-sm tabular-nums" data-testid="properties-pos-y">
                    {element.kind === 'gate'
                      ? element.gate.position.y
                      : element.node.position.y}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Rotation (gates only) */}
          {element.kind === 'gate' && (
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <RotateCw className="w-3 h-3" />
                Rotation
              </Label>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-8 px-2.5 rounded-md bg-secondary/50 border border-border flex items-center">
                  <span className="text-sm tabular-nums" data-testid="properties-rotation">
                    {Math.round((element.gate.rotation.z * 180) / Math.PI)}
                  </span>
                  <span className="text-xs text-muted-foreground ml-0.5">deg</span>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-8 px-2.5"
                  onClick={handleRotate}
                  data-testid="properties-rotate"
                >
                  +90
                </Button>
              </div>
            </div>
          )}

          {/* Default Value for Input Nodes */}
          {element.kind === 'input' && (
            <div className="col-span-2 flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
              <div>
                <p className="text-sm font-medium">Default Value</p>
                <p className="text-xs text-muted-foreground">
                  Initial state when simulation starts
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'text-xs font-mono',
                    element.node.value ? 'text-primary' : 'text-muted-foreground',
                  )}
                  data-testid="properties-value-display"
                >
                  {element.node.value ? '1' : '0'}
                </span>
                <Switch
                  checked={element.node.value !== 0}
                  onCheckedChange={handleDefaultValueToggle}
                  data-testid="properties-value-toggle"
                />
              </div>
            </div>
          )}

          {/* Wire Connection Info */}
          {element.kind === 'wire' && (
            <div className="col-span-2 p-3 rounded-lg bg-secondary/30 border border-border">
              <p className="text-xs text-muted-foreground mb-2">Connections</p>
              <div className="flex items-center gap-2 text-sm">
                <span className="px-2 py-0.5 rounded bg-secondary" data-testid="properties-wire-from">
                  {formatEndpoint(element.wire.from)}
                </span>
                <span className="text-muted-foreground">to</span>
                <span className="px-2 py-0.5 rounded bg-secondary" data-testid="properties-wire-to">
                  {formatEndpoint(element.wire.to)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
