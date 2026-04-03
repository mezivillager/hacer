import { useState, useEffect, useRef } from 'react'
import {
  X,
  Trash2,
  Copy,
  RotateCw,
  Tag,
  Palette,
  SlidersHorizontal,
  ChevronDown,
} from 'lucide-react'
import { Button } from './shadcn/button'
import { Input } from './shadcn/input'
import { Label } from './shadcn/label'
import { Switch } from './shadcn/switch'
import { Separator } from './shadcn/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from './shadcn/tooltip'
import { Popover, PopoverContent, PopoverTrigger } from './shadcn/popover'
import { cn } from '@lib/utils'
import { useCircuitStore } from '@/store/circuitStore'
import { circuitActions } from '@/store/circuitStore'
import type { GateType } from '@/store/types'

// Types for circuit elements
export type ElementType = 'gate' | 'wire' | 'input' | 'output' | 'junction'

export interface SelectedElement {
  id: string
  type: ElementType
  name: string
  position?: { x: number; y: number }
  rotation?: number
  color?: string
  // Gate-specific
  gateType?: GateType
  // Wire-specific
  wireFrom?: string
  wireTo?: string
  // I/O-specific
  defaultValue?: number
  label?: string
}

interface PropertiesPanelProps {
  onClose?: () => void
}

const colors = [
  { name: 'Default', value: 'default' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Cyan', value: '#06b6d4' },
]

export function PropertiesPanel({ onClose }: PropertiesPanelProps) {
  const [localName, setLocalName] = useState('')
  const [localLabel, setLocalLabel] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Get selected element from store
  const selectedGateId = useCircuitStore((state) => state.selectedGateId)
  const selectedWireId = useCircuitStore((state) => state.selectedWireId)
  const selectedNodeId = useCircuitStore((state) => state.selectedNodeId)
  const selectedNodeType = useCircuitStore((state) => state.selectedNodeType)

  const gates = useCircuitStore((state) => state.gates)
  const wires = useCircuitStore((state) => state.wires)
  const inputNodes = useCircuitStore((state) => state.inputNodes)
  const outputNodes = useCircuitStore((state) => state.outputNodes)

  // Determine which element is selected
  const selectedElement: SelectedElement | null = (() => {
    if (selectedGateId) {
      const gate = gates.find((g) => g.id === selectedGateId)
      if (!gate) return null
      return {
        id: gate.id,
        type: 'gate',
        name: gate.id,
        position: { x: gate.position.x, y: gate.position.z },
        rotation: gate.rotation.y,
        gateType: gate.type,
      }
    }

    if (selectedWireId) {
      const wire = wires.find((w) => w.id === selectedWireId)
      if (!wire) return null
      return {
        id: wire.id,
        type: 'wire',
        name: wire.id,
        wireFrom: `${wire.from.type}:${wire.from.entityId}`,
        wireTo: `${wire.to.type}:${wire.to.entityId}`,
      }
    }

    if (selectedNodeId && selectedNodeType) {
      if (selectedNodeType === 'input') {
        const node = inputNodes.find((n) => n.id === selectedNodeId)
        if (!node) return null
        return {
          id: node.id,
          type: 'input',
          name: node.name,
          label: node.name,
          position: { x: node.position.x, y: node.position.z },
          rotation: node.rotation.y,
          defaultValue: node.value,
        }
      } else {
        const node = outputNodes.find((n) => n.id === selectedNodeId)
        if (!node) return null
        return {
          id: node.id,
          type: 'output',
          name: node.name,
          label: node.name,
          position: { x: node.position.x, y: node.position.z },
          rotation: node.rotation.y,
        }
      }
    }

    return null
  })()

  useEffect(() => {
    if (selectedElement) {
      setLocalName(selectedElement.name)
      setLocalLabel(selectedElement.label || '')
    }
  }, [selectedElement])

  if (!selectedElement) return null

  const handleNameChange = () => {
    if (localName !== selectedElement.name) {
      // Update name through store actions
      if (selectedElement.type === 'input') {
        circuitActions.renameInputNode(selectedElement.id, localName)
      } else if (selectedElement.type === 'output') {
        circuitActions.renameOutputNode(selectedElement.id, localName)
      }
    }
    setIsEditing(false)
  }

  const handleLabelChange = () => {
    if (localLabel !== selectedElement.label) {
      // Label changes for I/O nodes
      if (selectedElement.type === 'input') {
        circuitActions.renameInputNode(selectedElement.id, localLabel)
      } else if (selectedElement.type === 'output') {
        circuitActions.renameOutputNode(selectedElement.id, localLabel)
      }
    }
  }

  const handleRotate = () => {
    if (selectedElement.type === 'gate' && selectedGateId) {
      const gate = gates.find((g) => g.id === selectedGateId)
      if (gate) {
        const newRotation = (gate.rotation.y + Math.PI / 2) % (Math.PI * 2)
        circuitActions.rotateGate(selectedGateId, newRotation)
      }
    }
  }

  const handleDelete = () => {
    if (selectedElement.type === 'gate' && selectedGateId) {
      circuitActions.deleteGate(selectedGateId)
    } else if (selectedElement.type === 'wire' && selectedWireId) {
      circuitActions.deleteWire(selectedWireId)
    } else if (selectedElement.type === 'input' && selectedNodeId) {
      circuitActions.removeInputNode(selectedNodeId)
    } else if (selectedElement.type === 'output' && selectedNodeId) {
      circuitActions.removeOutputNode(selectedNodeId)
    }
    onClose?.()
  }

  const handleDuplicate = () => {
    // Duplication not yet implemented in store
    // TODO: Add duplication actions
  }

  const handleDefaultValueToggle = () => {
    if (selectedElement.type === 'input' && selectedNodeId) {
      const node = inputNodes.find((n) => n.id === selectedNodeId)
      if (node) {
        circuitActions.setInputValue(selectedNodeId, node.value === 1 ? 0 : 1)
      }
    }
  }

  const getTypeLabel = (type: ElementType) => {
    switch (type) {
      case 'gate':
        return selectedElement.gateType || 'Gate'
      case 'wire':
        return 'Wire'
      case 'input':
        return 'Input'
      case 'output':
        return 'Output'
      case 'junction':
        return 'Junction'
      default:
        return 'Element'
    }
  }

  const handleClose = () => {
    circuitActions.clearSelection()
    onClose?.()
  }

  return (
    <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-[400px] bg-card border border-border rounded-lg shadow-xl overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-secondary/30 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{
                backgroundColor:
                  selectedElement.color !== 'default'
                    ? selectedElement.color
                    : 'var(--primary)',
              }}
            />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {getTypeLabel(selectedElement.type)}
            </span>
          </div>
          <Separator orientation="vertical" className="h-4" />
          {isEditing ? (
            <Input
              ref={inputRef}
              value={localName}
              onChange={(e) => setLocalName(e.target.value)}
              onBlur={handleNameChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleNameChange()
                if (e.key === 'Escape') {
                  setLocalName(selectedElement.name)
                  setIsEditing(false)
                }
              }}
              className="h-6 w-32 text-sm px-1.5"
              autoFocus
            />
          ) : (
            <button
              onClick={() => {
                setIsEditing(true)
                setTimeout(() => inputRef.current?.select(), 0)
              }}
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              {selectedElement.name}
            </button>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7"
                onClick={handleDuplicate}
              >
                <Copy className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Duplicate (Cmd+D)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7 text-destructive hover:text-destructive"
                onClick={handleDelete}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete (Del)</TooltipContent>
          </Tooltip>
          <Separator orientation="vertical" className="h-4 mx-1" />
          <Button variant="ghost" size="icon" className="w-7 h-7" onClick={handleClose}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Properties Grid */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Label/Display Name */}
          {(selectedElement.type === 'input' || selectedElement.type === 'output') && (
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <Tag className="w-3 h-3" />
                Display Label
              </Label>
              <Input
                value={localLabel}
                onChange={(e) => setLocalLabel(e.target.value)}
                onBlur={handleLabelChange}
                placeholder="e.g., A, B, CLK, OUT"
                className="h-8 text-sm"
              />
            </div>
          )}

          {/* Position (read-only display) */}
          {selectedElement.position && (
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <SlidersHorizontal className="w-3 h-3" />
                Position
              </Label>
              <div className="flex gap-2">
                <div className="flex-1 h-8 px-2.5 rounded-md bg-secondary/50 border border-border flex items-center">
                  <span className="text-xs text-muted-foreground mr-1">X</span>
                  <span className="text-sm tabular-nums">
                    {selectedElement.position.x.toFixed(1)}
                  </span>
                </div>
                <div className="flex-1 h-8 px-2.5 rounded-md bg-secondary/50 border border-border flex items-center">
                  <span className="text-xs text-muted-foreground mr-1">Z</span>
                  <span className="text-sm tabular-nums">
                    {selectedElement.position.y.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Rotation */}
          {selectedElement.type !== 'wire' && selectedElement.rotation !== undefined && (
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <RotateCw className="w-3 h-3" />
                Rotation
              </Label>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-8 px-2.5 rounded-md bg-secondary/50 border border-border flex items-center">
                  <span className="text-sm tabular-nums">
                    {Math.round((selectedElement.rotation * 180) / Math.PI)}
                  </span>
                  <span className="text-xs text-muted-foreground ml-0.5">deg</span>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-8 px-2.5"
                  onClick={handleRotate}
                >
                  +90
                </Button>
              </div>
            </div>
          )}

          {/* Color */}
          {selectedElement.type === 'gate' && (
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <Palette className="w-3 h-3" />
                Color
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full h-8 justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full border border-border"
                        style={{
                          backgroundColor:
                            selectedElement.color !== 'default'
                              ? selectedElement.color
                              : 'var(--primary)',
                        }}
                      />
                      {colors.find((c) => c.value === selectedElement.color)?.name ||
                        'Default'}
                    </div>
                    <ChevronDown className="w-3 h-3 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-40 p-1" align="start">
                  {colors.map((color) => (
                    <Button
                      key={color.value}
                      variant={
                        selectedElement.color === color.value ? 'secondary' : 'ghost'
                      }
                      size="sm"
                      className="w-full justify-start gap-2 h-7"
                      onClick={() => {
                        // Color change not implemented yet
                      }}
                    >
                      <div
                        className="w-3 h-3 rounded-full border border-border"
                        style={{
                          backgroundColor:
                            color.value !== 'default' ? color.value : 'var(--primary)',
                        }}
                      />
                      <span className="text-xs">{color.name}</span>
                    </Button>
                  ))}
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Default Value for Inputs */}
          {selectedElement.type === 'input' && (
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
                    selectedElement.defaultValue
                      ? 'text-primary'
                      : 'text-muted-foreground'
                  )}
                >
                  {selectedElement.defaultValue ? '1' : '0'}
                </span>
                <Switch
                  checked={!!selectedElement.defaultValue}
                  onCheckedChange={handleDefaultValueToggle}
                />
              </div>
            </div>
          )}

          {/* Wire Connection Info */}
          {selectedElement.type === 'wire' && (
            <div className="col-span-2 p-3 rounded-lg bg-secondary/30 border border-border">
              <p className="text-xs text-muted-foreground mb-2">Connections</p>
              <div className="flex items-center gap-2 text-sm">
                <span className="px-2 py-0.5 rounded bg-secondary">
                  {selectedElement.wireFrom || '—'}
                </span>
                <span className="text-muted-foreground">to</span>
                <span className="px-2 py-0.5 rounded bg-secondary">
                  {selectedElement.wireTo || '—'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
