// BusComponentRenderer - dispatches to the right bus component by kind
import { useCircuitStore } from '@/store/circuitStore'
import { useBusDrag } from '@/hooks/useBusDrag'
import type { BusComponent } from '@/store/types'
import { BusSplitter3D, type BusPinClickHandler } from './BusSplitter3D'
import { BusJoiner3D } from './BusJoiner3D'

interface BusComponentRendererProps {
  component: BusComponent
  onPinClick?: BusPinClickHandler
  onClick?: () => void
  selected?: boolean
}

export function BusComponentRenderer({ component, onPinClick, onClick, selected = false }: BusComponentRendererProps) {
  const canDrag = useCircuitStore((s) => s.wiringFrom === null && s.busPlacementMode === null)
  const drag = useBusDrag(component.id)

  switch (component.kind) {
    case 'splitter':
      return (
        <BusSplitter3D
          component={component}
          onPinClick={onPinClick}
          onClick={onClick}
          selected={selected}
          canDrag={canDrag}
          drag={drag}
        />
      )
    case 'joiner':
      return (
        <BusJoiner3D
          component={component}
          onPinClick={onPinClick}
          onClick={onClick}
          selected={selected}
          canDrag={canDrag}
          drag={drag}
        />
      )
    default:
      return ((_: never) => null)(component.kind)
  }
}
BusComponentRenderer.displayName = 'BusComponentRenderer'
