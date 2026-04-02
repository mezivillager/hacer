"use client"

import { useState, useEffect, useRef } from "react"
import {
  X,
  Trash2,
  Copy,
  RotateCw,
  Tag,
  Palette,
  SlidersHorizontal,
  ChevronDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

// Types for circuit elements
export type ElementType = "gate" | "wire" | "input" | "output" | "junction"

export interface SelectedElement {
  id: string
  type: ElementType
  name: string
  position?: { x: number; y: number }
  rotation?: number
  color?: string
  // Gate-specific
  gateType?: "nand" | "and" | "or" | "not" | "xor"
  // Wire-specific
  wireFrom?: string
  wireTo?: string
  // I/O-specific
  defaultValue?: boolean
  label?: string
}

interface PropertiesPanelProps {
  selectedElement: SelectedElement | null
  onUpdate: (element: SelectedElement) => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
  onClose: () => void
}

const colors = [
  { name: "Default", value: "default" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Green", value: "#22c55e" },
  { name: "Yellow", value: "#eab308" },
  { name: "Red", value: "#ef4444" },
  { name: "Purple", value: "#a855f7" },
  { name: "Cyan", value: "#06b6d4" },
]

export function PropertiesPanel({
  selectedElement,
  onUpdate,
  onDelete,
  onDuplicate,
  onClose,
}: PropertiesPanelProps) {
  const [localName, setLocalName] = useState("")
  const [localLabel, setLocalLabel] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (selectedElement) {
      setLocalName(selectedElement.name)
      setLocalLabel(selectedElement.label || "")
    }
  }, [selectedElement])

  if (!selectedElement) return null

  const handleNameChange = () => {
    if (localName !== selectedElement.name) {
      onUpdate({ ...selectedElement, name: localName })
    }
    setIsEditing(false)
  }

  const handleLabelChange = () => {
    if (localLabel !== selectedElement.label) {
      onUpdate({ ...selectedElement, label: localLabel })
    }
  }

  const handleRotate = () => {
    const currentRotation = selectedElement.rotation || 0
    onUpdate({ ...selectedElement, rotation: (currentRotation + 90) % 360 })
  }

  const handleColorChange = (color: string) => {
    onUpdate({ ...selectedElement, color })
  }

  const handleDefaultValueToggle = () => {
    onUpdate({ ...selectedElement, defaultValue: !selectedElement.defaultValue })
  }

  const getTypeLabel = (type: ElementType) => {
    switch (type) {
      case "gate":
        return selectedElement.gateType?.toUpperCase() || "Gate"
      case "wire":
        return "Wire"
      case "input":
        return "Input"
      case "output":
        return "Output"
      case "junction":
        return "Junction"
      default:
        return "Element"
    }
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
                  selectedElement.color !== "default"
                    ? selectedElement.color
                    : "var(--primary)",
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
                if (e.key === "Enter") handleNameChange()
                if (e.key === "Escape") {
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
                onClick={() => onDuplicate(selectedElement.id)}
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
                onClick={() => onDelete(selectedElement.id)}
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
            onClick={onClose}
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Properties Grid */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Label/Display Name */}
          {(selectedElement.type === "input" ||
            selectedElement.type === "output") && (
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
                    {selectedElement.position.x}
                  </span>
                </div>
                <div className="flex-1 h-8 px-2.5 rounded-md bg-secondary/50 border border-border flex items-center">
                  <span className="text-xs text-muted-foreground mr-1">Y</span>
                  <span className="text-sm tabular-nums">
                    {selectedElement.position.y}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Rotation */}
          {selectedElement.type !== "wire" && (
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <RotateCw className="w-3 h-3" />
                Rotation
              </Label>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-8 px-2.5 rounded-md bg-secondary/50 border border-border flex items-center">
                  <span className="text-sm tabular-nums">
                    {selectedElement.rotation || 0}
                  </span>
                  <span className="text-xs text-muted-foreground ml-0.5">
                    deg
                  </span>
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
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <Palette className="w-3 h-3" />
              Color
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full h-8 justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full border border-border"
                      style={{
                        backgroundColor:
                          selectedElement.color !== "default"
                            ? selectedElement.color
                            : "var(--primary)",
                      }}
                    />
                    {colors.find((c) => c.value === selectedElement.color)
                      ?.name || "Default"}
                  </div>
                  <ChevronDown className="w-3 h-3 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-40 p-1" align="start">
                {colors.map((color) => (
                  <Button
                    key={color.value}
                    variant={
                      selectedElement.color === color.value
                        ? "secondary"
                        : "ghost"
                    }
                    size="sm"
                    className="w-full justify-start gap-2 h-7"
                    onClick={() => handleColorChange(color.value)}
                  >
                    <div
                      className="w-3 h-3 rounded-full border border-border"
                      style={{
                        backgroundColor:
                          color.value !== "default"
                            ? color.value
                            : "var(--primary)",
                      }}
                    />
                    <span className="text-xs">{color.name}</span>
                  </Button>
                ))}
              </PopoverContent>
            </Popover>
          </div>

          {/* Default Value for Inputs */}
          {selectedElement.type === "input" && (
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
                    "text-xs font-mono",
                    selectedElement.defaultValue
                      ? "text-primary"
                      : "text-muted-foreground"
                  )}
                >
                  {selectedElement.defaultValue ? "1" : "0"}
                </span>
                <Switch
                  checked={selectedElement.defaultValue}
                  onCheckedChange={handleDefaultValueToggle}
                />
              </div>
            </div>
          )}

          {/* Wire Connection Info */}
          {selectedElement.type === "wire" && (
            <div className="col-span-2 p-3 rounded-lg bg-secondary/30 border border-border">
              <p className="text-xs text-muted-foreground mb-2">Connections</p>
              <div className="flex items-center gap-2 text-sm">
                <span className="px-2 py-0.5 rounded bg-secondary">
                  {selectedElement.wireFrom || "—"}
                </span>
                <span className="text-muted-foreground">to</span>
                <span className="px-2 py-0.5 rounded bg-secondary">
                  {selectedElement.wireTo || "—"}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
