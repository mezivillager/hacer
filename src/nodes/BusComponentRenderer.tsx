// BusComponentRenderer - dispatches to the right bus component by kind
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
  switch (component.kind) {
    case 'splitter':
      return <BusSplitter3D component={component} onPinClick={onPinClick} onClick={onClick} selected={selected} />
    case 'joiner':
      return <BusJoiner3D component={component} onPinClick={onPinClick} onClick={onClick} selected={selected} />
    default:
      return ((_: never) => null)(component.kind)
  }
}
BusComponentRenderer.displayName = 'BusComponentRenderer'
