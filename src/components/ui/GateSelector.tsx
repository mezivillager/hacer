import { Tooltip } from 'antd'
import { useCircuitStore } from '@/store/circuitStore'
import type { GateType } from '@/store/types'
import { getGateIcon } from '@/gates/icons'
import { colors } from '@/theme'

// Elementary gates to show in the selector
const ELEMENTARY_GATES: GateType[] = ['NAND', 'AND', 'OR', 'NOT', 'XOR']

// Gate descriptions for tooltips
const gateDescriptions: Record<GateType, string> = {
  NAND: 'NAND Gate - Output is LOW only when both inputs are HIGH',
  AND: 'AND Gate - Output is HIGH only when both inputs are HIGH',
  OR: 'OR Gate - Output is HIGH when at least one input is HIGH',
  NOT: 'NOT Gate (Inverter) - Output is the inverse of the input',
  NOR: 'NOR Gate - Output is HIGH only when both inputs are LOW',
  XOR: 'XOR Gate - Output is HIGH when inputs are different',
  XNOR: 'XNOR Gate - Output is HIGH when inputs are the same',
}

export function GateSelector() {
  // Use selectors for granular subscriptions
  const placementMode = useCircuitStore((s) => s.placementMode)
  const startPlacement = useCircuitStore((s) => s.startPlacement)
  const cancelPlacement = useCircuitStore((s) => s.cancelPlacement)

  const handleGateSelect = (type: GateType) => {
    if (placementMode === type) {
      // If already placing this type, cancel placement
      cancelPlacement()
    } else {
      // Start placement for this gate type
      startPlacement(type)
    }
  }

  return (
    <div className="gate-selector-grid">
      {ELEMENTARY_GATES.map(type => {
        const IconComponent = getGateIcon(type)
        const isActive = placementMode === type

        return (
          <Tooltip key={type} title={gateDescriptions[type]} placement="right">
            <div
              className={`gate-icon ${isActive ? 'active' : ''}`}
              onClick={() => handleGateSelect(type)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleGateSelect(type)
                }
              }}
            >
              <IconComponent size={36} color={isActive ? colors.primary : colors.text.secondary} />
              <span className="gate-icon-label">{type}</span>
            </div>
          </Tooltip>
        )
      })}
    </div>
  )
}
