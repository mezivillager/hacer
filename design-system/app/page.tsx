"use client"

import { useState } from "react"
import { CompactToolbar } from "@/components/circuit-designer/compact-toolbar"
import { CircuitCanvas } from "@/components/circuit-designer/circuit-canvas"
import { RightActionBar } from "@/components/circuit-designer/right-action-bar"
import { PropertiesPanel, SelectedElement } from "@/components/circuit-designer/properties-panel"
import { MockCircuitElements, mockElements } from "@/components/circuit-designer/mock-circuit-elements"
import { HelpBar } from "@/components/circuit-designer/help-bar"
import { TooltipProvider } from "@/components/ui/tooltip"

export default function CircuitDesignerPage() {
  const [showAxes, setShowAxes] = useState(true)
  const [isSimulating, setIsSimulating] = useState(false)
  const [selectedGate, setSelectedGate] = useState<string | null>(null)
  const [helpBarCollapsed, setHelpBarCollapsed] = useState(false)
  
  // Selection state for properties panel
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null)
  
  // History state
  const [historyEntries, setHistoryEntries] = useState<Array<{
    id: string
    action: string
    timestamp: Date
  }>>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  
  const [circuitInfo] = useState({
    gates: mockElements.filter(e => e.type === "gate").length,
    wires: mockElements.filter(e => e.type === "wire").length,
    inputs: mockElements.filter(e => e.type === "input").length,
    outputs: mockElements.filter(e => e.type === "output").length,
    status: "Paused" as "Paused" | "Running",
  })

  const handleRunSimulation = () => {
    setIsSimulating(!isSimulating)
    addHistoryEntry(isSimulating ? "Paused simulation" : "Started simulation")
  }
  
  const addHistoryEntry = (action: string) => {
    const newEntry = {
      id: crypto.randomUUID(),
      action,
      timestamp: new Date(),
    }
    setHistoryEntries((prev) => [...prev.slice(0, historyIndex + 1), newEntry])
    setHistoryIndex((prev) => prev + 1)
  }
  
  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex((prev) => prev - 1)
    }
  }
  
  const handleRedo = () => {
    if (historyIndex < historyEntries.length - 1) {
      setHistoryIndex((prev) => prev + 1)
    }
  }
  
  const handleElementSelect = (element: SelectedElement) => {
    setSelectedElement(element)
  }
  
  const handleElementDeselect = () => {
    setSelectedElement(null)
  }
  
  const handleElementUpdate = (element: SelectedElement) => {
    setSelectedElement(element)
    addHistoryEntry(`Updated ${element.name}`)
  }
  
  const handleElementDelete = (id: string) => {
    addHistoryEntry(`Deleted ${selectedElement?.name}`)
    setSelectedElement(null)
  }
  
  const handleElementDuplicate = (id: string) => {
    addHistoryEntry(`Duplicated ${selectedElement?.name}`)
  }

  return (
    <TooltipProvider>
      <div className="flex h-screen w-full bg-background overflow-hidden">
        {/* Compact Left Toolbar */}
        <CompactToolbar
          showAxes={showAxes}
          onToggleAxes={() => setShowAxes(!showAxes)}
          isSimulating={isSimulating}
          onRunSimulation={handleRunSimulation}
          selectedGate={selectedGate}
          onSelectGate={setSelectedGate}
        />

        {/* Main Canvas Area */}
        <div className="flex-1 relative">
          <CircuitCanvas showAxes={showAxes} />
          
          {/* Mock Circuit Elements Overlay */}
          <MockCircuitElements
            selectedId={selectedElement?.id ?? null}
            onSelect={handleElementSelect}
            onDeselect={handleElementDeselect}
          />
          
          {/* Right Action Bar with Panels */}
          <RightActionBar
            circuitInfo={circuitInfo}
            historyEntries={historyEntries}
            onUndo={handleUndo}
            onRedo={handleRedo}
            canUndo={historyIndex > 0}
            canRedo={historyIndex < historyEntries.length - 1}
          />
          
          {/* Properties Panel (context-aware for selection) */}
          <PropertiesPanel
            selectedElement={selectedElement}
            onUpdate={handleElementUpdate}
            onDelete={handleElementDelete}
            onDuplicate={handleElementDuplicate}
            onClose={handleElementDeselect}
          />
        </div>

        {/* Help Bar */}
        <HelpBar
          collapsed={helpBarCollapsed}
          onCollapsedChange={setHelpBarCollapsed}
        />
      </div>
    </TooltipProvider>
  )
}
