// BusComponentRenderer - dispatches to the right bus component by kind
import type { BusComponent } from '@/store/types'
import { BusSplitter3D, type BusPinClickHandler } from './BusSplitter3D'
import { BusJoiner3D } from './BusJoiner3D'

interface BusComponentRendererProps {
  component: BusComponent
  onPinClick?: BusPinClickHandler
}

export function BusComponentRenderer({ component, onPinClick }: BusComponentRendererProps) {
  switch (component.kind) {
    case 'splitter':
      return <BusSplitter3D component={component} onPinClick={onPinClick} />
    case 'joiner':
      return <BusJoiner3D component={component} onPinClick={onPinClick} />
    default:
      return ((_: never) => null)(component.kind)
  }
}
BusComponentRenderer.displayName = 'BusComponentRenderer'
