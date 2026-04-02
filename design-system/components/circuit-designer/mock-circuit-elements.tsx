"use client"

import { cn } from "@/lib/utils"
import { SelectedElement } from "./properties-panel"

// Mock data for demonstration
export const mockElements: SelectedElement[] = [
  {
    id: "gate-nand-1",
    type: "gate",
    name: "NAND_1",
    gateType: "nand",
    position: { x: 200, y: 150 },
    rotation: 0,
    color: "default",
  },
  {
    id: "gate-and-1",
    type: "gate",
    name: "AND_1",
    gateType: "and",
    position: { x: 400, y: 250 },
    rotation: 0,
    color: "default",
  },
  {
    id: "input-1",
    type: "input",
    name: "IN_A",
    position: { x: 80, y: 120 },
    rotation: 0,
    color: "default",
    defaultValue: false,
  },
  {
    id: "output-1",
    type: "output",
    name: "OUT_1",
    position: { x: 550, y: 200 },
    rotation: 0,
    color: "default",
  },
  {
    id: "wire-1",
    type: "wire",
    name: "Wire_1",
    position: { x: 0, y: 0 },
    rotation: 0,
    color: "default",
    connections: { from: "IN_A", to: "NAND_1" },
  },
]

interface MockCircuitElementsProps {
  selectedId: string | null
  onSelect: (element: SelectedElement) => void
  onDeselect: () => void
}

export function MockCircuitElements({
  selectedId,
  onSelect,
  onDeselect,
}: MockCircuitElementsProps) {
  return (
    <div 
      className="absolute inset-0 pointer-events-none"
      onClick={(e) => {
        // Only deselect if clicking the background, not an element
        if (e.target === e.currentTarget) {
          onDeselect()
        }
      }}
    >
      {/* Mock Gates */}
      {mockElements
        .filter((el) => el.type === "gate")
        .map((gate) => (
          <GateElement
            key={gate.id}
            element={gate}
            isSelected={selectedId === gate.id}
            onSelect={() => onSelect(gate)}
          />
        ))}

      {/* Mock Input */}
      {mockElements
        .filter((el) => el.type === "input")
        .map((input) => (
          <InputElement
            key={input.id}
            element={input}
            isSelected={selectedId === input.id}
            onSelect={() => onSelect(input)}
          />
        ))}

      {/* Mock Output */}
      {mockElements
        .filter((el) => el.type === "output")
        .map((output) => (
          <OutputElement
            key={output.id}
            element={output}
            isSelected={selectedId === output.id}
            onSelect={() => onSelect(output)}
          />
        ))}

      {/* Mock Wire */}
      <WireElement
        element={mockElements.find((el) => el.type === "wire")!}
        isSelected={selectedId === "wire-1"}
        onSelect={() => onSelect(mockElements.find((el) => el.type === "wire")!)}
        startPos={{ x: 130, y: 120 }}
        endPos={{ x: 170, y: 150 }}
      />
    </div>
  )
}

interface ElementProps {
  element: SelectedElement
  isSelected: boolean
  onSelect: () => void
}

function GateElement({ element, isSelected, onSelect }: ElementProps) {
  const gateSymbols: Record<string, string> = {
    nand: "⊼",
    and: "&",
    or: "≥1",
    not: "1",
    xor: "=1",
    nor: "≥1",
  }

  return (
    <div
      className={cn(
        "absolute pointer-events-auto cursor-pointer",
        "transition-all duration-150"
      )}
      style={{
        left: element.position.x,
        top: element.position.y,
        transform: `rotate(${element.rotation}deg)`,
      }}
      onClick={(e) => {
        e.stopPropagation()
        onSelect()
      }}
    >
      {/* Gate Body */}
      <div
        className={cn(
          "relative w-16 h-12 rounded-r-xl border-2 flex items-center justify-center",
          "bg-card/90 backdrop-blur-sm",
          isSelected
            ? "border-primary ring-2 ring-primary/30"
            : "border-border hover:border-muted-foreground"
        )}
      >
        {/* Gate Type Indicator */}
        <span className="text-sm font-mono font-semibold text-foreground">
          {gateSymbols[element.gateType || "and"]}
        </span>

        {/* Inversion bubble for NAND */}
        {element.gateType === "nand" && (
          <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-border bg-card" />
        )}

        {/* Input pins */}
        <div className="absolute -left-3 top-2 w-3 h-0.5 bg-muted-foreground" />
        <div className="absolute -left-3 bottom-2 w-3 h-0.5 bg-muted-foreground" />

        {/* Output pin */}
        <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-3 h-0.5 bg-muted-foreground" />
      </div>

      {/* Label */}
      <div
        className={cn(
          "absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-mono whitespace-nowrap",
          isSelected ? "text-primary" : "text-muted-foreground"
        )}
      >
        {element.name}
      </div>
    </div>
  )
}

function InputElement({ element, isSelected, onSelect }: ElementProps) {
  return (
    <div
      className={cn(
        "absolute pointer-events-auto cursor-pointer",
        "transition-all duration-150"
      )}
      style={{
        left: element.position.x,
        top: element.position.y,
      }}
      onClick={(e) => {
        e.stopPropagation()
        onSelect()
      }}
    >
      <div
        className={cn(
          "relative w-12 h-8 rounded-l-lg border-2 flex items-center justify-center",
          "bg-card/90 backdrop-blur-sm",
          isSelected
            ? "border-primary ring-2 ring-primary/30"
            : "border-border hover:border-muted-foreground"
        )}
      >
        {/* Arrow indicator */}
        <svg
          className="w-4 h-4 text-muted-foreground"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>

        {/* Output pin */}
        <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-3 h-0.5 bg-muted-foreground" />
      </div>

      {/* Label */}
      <div
        className={cn(
          "absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-mono whitespace-nowrap",
          isSelected ? "text-primary" : "text-muted-foreground"
        )}
      >
        {element.name}
      </div>
    </div>
  )
}

function OutputElement({ element, isSelected, onSelect }: ElementProps) {
  return (
    <div
      className={cn(
        "absolute pointer-events-auto cursor-pointer",
        "transition-all duration-150"
      )}
      style={{
        left: element.position.x,
        top: element.position.y,
      }}
      onClick={(e) => {
        e.stopPropagation()
        onSelect()
      }}
    >
      <div
        className={cn(
          "relative w-12 h-8 rounded-r-lg border-2 flex items-center justify-center",
          "bg-card/90 backdrop-blur-sm",
          isSelected
            ? "border-primary ring-2 ring-primary/30"
            : "border-border hover:border-muted-foreground"
        )}
      >
        {/* Circle indicator */}
        <div className="w-3 h-3 rounded-full border-2 border-muted-foreground" />

        {/* Input pin */}
        <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-3 h-0.5 bg-muted-foreground" />
      </div>

      {/* Label */}
      <div
        className={cn(
          "absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-mono whitespace-nowrap",
          isSelected ? "text-primary" : "text-muted-foreground"
        )}
      >
        {element.name}
      </div>
    </div>
  )
}

interface WireElementProps {
  element: SelectedElement
  isSelected: boolean
  onSelect: () => void
  startPos: { x: number; y: number }
  endPos: { x: number; y: number }
}

function WireElement({
  element,
  isSelected,
  onSelect,
  startPos,
  endPos,
}: WireElementProps) {
  // Calculate the midpoint for the clickable area
  const midX = (startPos.x + endPos.x) / 2
  const midY = (startPos.y + endPos.y) / 2

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ overflow: "visible" }}
    >
      {/* Wire path */}
      <path
        d={`M ${startPos.x} ${startPos.y} C ${startPos.x + 20} ${startPos.y}, ${endPos.x - 20} ${endPos.y}, ${endPos.x} ${endPos.y}`}
        fill="none"
        stroke={isSelected ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"}
        strokeWidth={isSelected ? 3 : 2}
        className="pointer-events-auto cursor-pointer"
        onClick={(e) => {
          e.stopPropagation()
          onSelect()
        }}
      />

      {/* Selection indicator / junction points */}
      <circle
        cx={startPos.x}
        cy={startPos.y}
        r={4}
        fill={isSelected ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"}
      />
      <circle
        cx={endPos.x}
        cy={endPos.y}
        r={4}
        fill={isSelected ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"}
      />

      {/* Wire label */}
      <text
        x={midX}
        y={midY - 8}
        fill={isSelected ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"}
        fontSize="10"
        fontFamily="monospace"
        textAnchor="middle"
        className="pointer-events-none"
      >
        {element.name}
      </text>
    </svg>
  )
}
