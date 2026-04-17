import { useState, useRef } from 'react'
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
import { Button } from '@/components/ui-kit/button'
import { Input } from '@/components/ui-kit/input'
import { Label } from '@/components/ui-kit/label'
import { Switch } from '@/components/ui-kit/switch'
import { Separator } from '@/components/ui-kit/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui-kit/tooltip'
import { cn } from '@/lib/utils'
import { ComingSoon } from '../coming-soon'
import { circuitActions } from '@/store/circuitStore'
import { notify } from '@/lib/notify'
import { useSelectedElement, type SelectedElement } from './useSelectedElement'

function getTypeLabel(el: SelectedElement): string {
  switch (el.kind) {
    case 'gate':
      return el.gateType
    case 'wire':
      return 'Wire'
    case 'input':
      return 'Input'
    case 'output':
      return 'Output'
  }
}

export function PropertiesPanel() {
  const selected = useSelectedElement()
  if (!selected) return null
  return <PropertiesPanelInner key={selected.id} selected={selected} />
}

/**
 * Inner component re-mounted via the parent's `key` whenever selection
 * changes. This keeps the editable name input as a normal controlled
 * field whose initial state is derived from props at mount time \u2014 no
 * useEffect-then-setState pattern needed.
 */
function PropertiesPanelInner({ selected }: { selected: SelectedElement }) {
  const initialName =
    selected.kind === 'input' || selected.kind === 'output' ? selected.name : ''
  const [localLabel, setLocalLabel] = useState(initialName)
  const inputRef = useRef<HTMLInputElement>(null)

  const isEditableNode = selected.kind === 'input' || selected.kind === 'output'

  const commitName = () => {
    if (!isEditableNode) return
    const trimmed = localLabel.trim()
    if (!trimmed) {
      notify.error('Name cannot be empty')
      setLocalLabel(selected.name)
      return
    }
    if (trimmed === selected.name) return
    if (selected.kind === 'input') {
      circuitActions.renameInputNode(selected.id, trimmed)
    } else if (selected.kind === 'output') {
      circuitActions.renameOutputNode(selected.id, trimmed)
    }
  }

  const cancelEdit = () => {
    if (isEditableNode) setLocalLabel(selected.name)
  }

  const handleDelete = () => {
    switch (selected.kind) {
      case 'gate':
        circuitActions.removeGate(selected.id)
        break
      case 'wire':
        circuitActions.removeWire(selected.id)
        break
      case 'input':
        circuitActions.removeInputNode(selected.id)
        break
      case 'output':
        circuitActions.removeOutputNode(selected.id)
        break
    }
  }

  const handleClose = () => circuitActions.deselectAll()

  const positionDisplay =
    selected.kind === 'gate' || selected.kind === 'input' || selected.kind === 'output'
      ? selected.position
      : null

  const rotationDisplay = selected.kind === 'gate' ? selected.rotation : null
  const wireConnections = selected.kind === 'wire' ? { from: selected.from, to: selected.to } : null

  return (
    <div
      data-testid="properties-panel"
      className="absolute bottom-16 left-1/2 -translate-x-1/2 w-[400px] bg-card border border-border rounded-lg shadow-xl overflow-hidden animate-in slide-in-from-bottom-4 duration-200 z-10"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-secondary/30 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span
              data-testid="properties-type-label"
              className="text-xs font-medium text-muted-foreground uppercase tracking-wider"
            >
              {getTypeLabel(selected)}
            </span>
          </div>
          <Separator orientation="vertical" className="h-4" />
          {isEditableNode ? (
            <Input
              data-testid="properties-name-field"
              ref={inputRef}
              value={localLabel}
              onChange={(e) => setLocalLabel(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  commitName()
                  inputRef.current?.blur()
                }
                if (e.key === 'Escape') {
                  cancelEdit()
                  inputRef.current?.blur()
                }
              }}
              className="h-6 w-32 text-sm px-1.5"
            />
          ) : (
            <ComingSoon label="Renaming gates/wires coming soon">
              <span
                data-testid="properties-name-field"
                tabIndex={0}
                className="text-sm font-medium text-muted-foreground cursor-not-allowed"
              >
                {selected.kind === 'gate' ? selected.name : selected.kind === 'wire' ? selected.id : ''}
              </span>
            </ComingSoon>
          )}
        </div>
        <div className="flex items-center gap-1">
          <ComingSoon>
            <Button
              data-testid="properties-duplicate"
              variant="ghost"
              size="icon"
              className="w-7 h-7"
              disabled
            >
              <Copy className="w-3.5 h-3.5" />
            </Button>
          </ComingSoon>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                data-testid="properties-delete"
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
          <Button
            data-testid="properties-close"
            variant="ghost"
            size="icon"
            className="w-7 h-7"
            onClick={handleClose}
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Properties grid */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-4">
          {positionDisplay && (
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <SlidersHorizontal className="w-3 h-3" />
                Position
              </Label>
              <div className="flex gap-2">
                <div className="flex-1 h-8 px-2.5 rounded-md bg-secondary/50 border border-border flex items-center">
                  <span className="text-xs text-muted-foreground mr-1">X</span>
                  <span className="text-sm tabular-nums">{positionDisplay.x.toFixed(1)}</span>
                </div>
                <div className="flex-1 h-8 px-2.5 rounded-md bg-secondary/50 border border-border flex items-center">
                  <span className="text-xs text-muted-foreground mr-1">Z</span>
                  <span className="text-sm tabular-nums">{positionDisplay.z.toFixed(1)}</span>
                </div>
              </div>
            </div>
          )}

          {rotationDisplay && (
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <RotateCw className="w-3 h-3" />
                Rotation
              </Label>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-8 px-2.5 rounded-md bg-secondary/50 border border-border flex items-center">
                  <span className="text-sm tabular-nums">
                    {((rotationDisplay.y * 180) / Math.PI).toFixed(0)}
                  </span>
                  <span className="text-xs text-muted-foreground ml-0.5">deg</span>
                </div>
                <ComingSoon>
                  <Button variant="secondary" size="sm" className="h-8 px-2.5" disabled>
                    +90
                  </Button>
                </ComingSoon>
              </div>
            </div>
          )}

          {/* Color (stub) */}
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <Palette className="w-3 h-3" />
              Color
            </Label>
            <ComingSoon>
              <Button variant="outline" className="w-full h-8 justify-between text-sm" disabled>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full border border-border bg-primary" />
                  Default
                </div>
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              </Button>
            </ComingSoon>
          </div>

          {/* Default Value (input nodes only — stub) */}
          {selected.kind === 'input' && (
            <div className="col-span-2 flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
              <div>
                <p className="text-sm font-medium">Default Value</p>
                <p className="text-xs text-muted-foreground">Coming soon</p>
              </div>
              <ComingSoon>
                <Switch disabled />
              </ComingSoon>
            </div>
          )}

          {/* Display Label hint for I/O (purely informational; the header field is the editor) */}
          {isEditableNode && (
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <Tag className="w-3 h-3" />
                Display Label
              </Label>
              <p className="text-xs text-muted-foreground">
                Edit the name in the header above. Press Enter to commit, Escape to cancel.
              </p>
            </div>
          )}

          {wireConnections && (
            <div className="col-span-2 p-3 rounded-lg bg-secondary/30 border border-border">
              <p className="text-xs text-muted-foreground mb-2">Connections</p>
              <div
                data-testid="properties-wire-connections"
                className="flex items-center gap-2 text-sm"
              >
                <span className="px-2 py-0.5 rounded bg-secondary truncate">
                  {wireConnections.from.entityId}
                  {wireConnections.from.pinId ? `.${wireConnections.from.pinId}` : ''}
                </span>
                <span className="text-muted-foreground">to</span>
                <span className={cn('px-2 py-0.5 rounded bg-secondary truncate')}>
                  {wireConnections.to.entityId}
                  {wireConnections.to.pinId ? `.${wireConnections.to.pinId}` : ''}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
