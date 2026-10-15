import { useCircuitStore } from '@/store/circuitStore'
import { useBusDrag } from '@/hooks/useBusDrag'
import type { BusComponent } from '@/store/types'
import { BusComponent3D, type BusPinClickHandler } from './BusComponent3D'
import { canDragPart } from './canDragPart'

interface BusComponentRendererProps {
  component: BusComponent
  onPinClick?: BusPinClickHandler
  onClick?: () => void
  selected?: boolean
}

export function BusComponentRenderer({ component, onPinClick, onClick, selected = false }: BusComponentRendererProps) {
  const canDrag = useCircuitStore(canDragPart)
  const drag = useBusDrag(component.id)

  return (
    <BusComponent3D
      component={component}
      onPinClick={onPinClick}
      onClick={onClick}
      selected={selected}
      canDrag={canDrag}
      drag={drag}
    />
  )
}
BusComponentRenderer.displayName = 'BusComponentRenderer'
