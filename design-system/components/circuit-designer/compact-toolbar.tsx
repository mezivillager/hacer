"use client"

import { useState, useEffect } from "react"
import { useTheme } from "next-themes"
import {
  Cpu,
  Play,
  Pause,
  Trash2,
  RotateCcw,
  Settings,
  Github,
  Grid3X3,
  CircleDot,
  ArrowRightFromLine,
  GitBranch,
  ChevronDown,
  Sun,
  Moon,
  Monitor,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"

// Gate SVG icons as small components
const NandGateIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={cn("w-4 h-4", className)} fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M3 6h6c5 0 9 3 9 6s-4 6-9 6H3V6z" />
    <circle cx="19" cy="12" r="2" />
  </svg>
)

const AndGateIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={cn("w-4 h-4", className)} fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M3 6h6c5 0 9 3 9 6s-4 6-9 6H3V6z" />
  </svg>
)

const OrGateIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={cn("w-4 h-4", className)} fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M3 6c2 2 2 6 0 12h4c6 0 12-3 14-6-2-3-8-6-14-6H3z" />
  </svg>
)

const NotGateIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={cn("w-4 h-4", className)} fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M3 6l12 6-12 6V6z" />
    <circle cx="17" cy="12" r="2" />
  </svg>
)

const XorGateIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={cn("w-4 h-4", className)} fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M5 6c2 2 2 6 0 12h4c6 0 12-3 14-6-2-3-8-6-14-6H5z" />
    <path d="M3 6c2 3 2 9 0 12" />
  </svg>
)

const gates = [
  { id: "nand", name: "NAND", icon: NandGateIcon },
  { id: "and", name: "AND", icon: AndGateIcon },
  { id: "or", name: "OR", icon: OrGateIcon },
  { id: "not", name: "NOT", icon: NotGateIcon },
  { id: "xor", name: "XOR", icon: XorGateIcon },
]

const ioElements = [
  { id: "input", name: "Input", icon: ArrowRightFromLine },
  { id: "output", name: "Output", icon: CircleDot },
  { id: "junction", name: "Junction", icon: GitBranch },
]

interface CompactToolbarProps {
  showAxes: boolean
  onToggleAxes: () => void
  isSimulating: boolean
  onRunSimulation: () => void
  selectedGate: string | null
  onSelectGate: (gate: string | null) => void
}

export function CompactToolbar({
  showAxes,
  onToggleAxes,
  isSimulating,
  onRunSimulation,
  selectedGate,
  onSelectGate,
}: CompactToolbarProps) {
  const [gatesOpen, setGatesOpen] = useState(false)
  const [ioOpen, setIoOpen] = useState(false)
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="flex flex-col h-full w-12 bg-sidebar border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex items-center justify-center h-12 border-b border-sidebar-border">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 text-primary">
              <Cpu className="w-4 h-4" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p className="font-semibold">HACER</p>
            <p className="text-xs text-muted-foreground">Hardware Architecture & Constraints Explorer</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Main Tools */}
      <div className="flex-1 flex flex-col items-center py-2 gap-1">
        {/* Gates Dropdown */}
        <Popover open={gatesOpen} onOpenChange={setGatesOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "w-9 h-9 relative",
                    gatesOpen && "bg-sidebar-accent"
                  )}
                >
                  <NandGateIcon className="w-5 h-5" />
                  <ChevronDown className="w-2 h-2 absolute bottom-1 right-1 opacity-60" />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="right">Gates</TooltipContent>
          </Tooltip>
          <PopoverContent side="right" align="start" className="w-48 p-2">
            <div className="text-xs font-medium text-muted-foreground mb-2 px-2">Elementary Gates</div>
            <div className="grid grid-cols-2 gap-1">
              {gates.map((gate) => {
                const Icon = gate.icon
                return (
                  <Button
                    key={gate.id}
                    variant={selectedGate === gate.id ? "secondary" : "ghost"}
                    size="sm"
                    className="justify-start gap-2 h-8"
                    onClick={() => {
                      onSelectGate(selectedGate === gate.id ? null : gate.id)
                      setGatesOpen(false)
                    }}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-xs">{gate.name}</span>
                  </Button>
                )
              })}
            </div>
          </PopoverContent>
        </Popover>

        {/* I/O Dropdown */}
        <Popover open={ioOpen} onOpenChange={setIoOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "w-9 h-9 relative",
                    ioOpen && "bg-sidebar-accent"
                  )}
                >
                  <CircleDot className="w-4 h-4" />
                  <ChevronDown className="w-2 h-2 absolute bottom-1 right-1 opacity-60" />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="right">Circuit I/O</TooltipContent>
          </Tooltip>
          <PopoverContent side="right" align="start" className="w-40 p-2">
            <div className="text-xs font-medium text-muted-foreground mb-2 px-2">Circuit I/O</div>
            <div className="flex flex-col gap-1">
              {ioElements.map((element) => {
                const Icon = element.icon
                return (
                  <Button
                    key={element.id}
                    variant={selectedGate === element.id ? "secondary" : "ghost"}
                    size="sm"
                    className="justify-start gap-2 h-8"
                    onClick={() => {
                      onSelectGate(selectedGate === element.id ? null : element.id)
                      setIoOpen(false)
                    }}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-xs">{element.name}</span>
                  </Button>
                )
              })}
            </div>
          </PopoverContent>
        </Popover>

        <Separator className="my-1 w-6" />

        {/* Simulation Controls */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isSimulating ? "default" : "ghost"}
              size="icon"
              className="w-9 h-9"
              onClick={onRunSimulation}
            >
              {isSimulating ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {isSimulating ? "Pause Simulation" : "Run Simulation"}
          </TooltipContent>
        </Tooltip>

        <Separator className="my-1 w-6" />

        {/* View Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={showAxes ? "secondary" : "ghost"}
              size="icon"
              className="w-9 h-9"
              onClick={onToggleAxes}
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <div className="flex items-center gap-2">
              <span>Show Axes</span>
              <Switch checked={showAxes} className="scale-75" />
            </div>
          </TooltipContent>
        </Tooltip>

        {/* Delete */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="w-9 h-9 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Delete Selected</TooltipContent>
        </Tooltip>

        {/* Clear All */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="w-9 h-9 text-muted-foreground hover:text-destructive"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Clear All</TooltipContent>
        </Tooltip>
      </div>

      {/* Bottom Actions */}
      <div className="flex flex-col items-center py-2 gap-1 border-t border-sidebar-border">
        {/* Theme Toggle */}
        <Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="w-9 h-9">
                  {mounted ? (
                    theme === "dark" ? (
                      <Moon className="w-4 h-4" />
                    ) : theme === "light" ? (
                      <Sun className="w-4 h-4" />
                    ) : (
                      <Monitor className="w-4 h-4" />
                    )
                  ) : (
                    <Monitor className="w-4 h-4" />
                  )}
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="right">Theme</TooltipContent>
          </Tooltip>
          <PopoverContent side="right" align="end" className="w-36 p-1">
            <div className="flex flex-col gap-0.5">
              <Button
                variant={theme === "light" ? "secondary" : "ghost"}
                size="sm"
                className="justify-start gap-2 h-8"
                onClick={() => setTheme("light")}
              >
                <Sun className="w-4 h-4" />
                <span className="text-xs">Light</span>
              </Button>
              <Button
                variant={theme === "dark" ? "secondary" : "ghost"}
                size="sm"
                className="justify-start gap-2 h-8"
                onClick={() => setTheme("dark")}
              >
                <Moon className="w-4 h-4" />
                <span className="text-xs">Dark</span>
              </Button>
              <Button
                variant={theme === "system" ? "secondary" : "ghost"}
                size="sm"
                className="justify-start gap-2 h-8"
                onClick={() => setTheme("system")}
              >
                <Monitor className="w-4 h-4" />
                <span className="text-xs">System</span>
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="w-9 h-9" asChild>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer">
                <Github className="w-4 h-4" />
              </a>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">GitHub</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="w-9 h-9">
              <Settings className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Settings</TooltipContent>
        </Tooltip>

        <div className="text-[10px] text-muted-foreground mt-1">v1.9.0</div>
      </div>
    </div>
  )
}
