import { useCircuitStore } from '@/store/circuitStore'
import { Wire3D } from '../Wire3D'
import { trackRender } from '@/utils/renderTracking'

/**
 * Wire preview - only renders when wiring is active.
 * Subscribes to wiringFrom state.
 */
export function WirePreview() {
  const wiringFrom = useCircuitStore((s) => s.wiringFrom)
  
  const isActive = wiringFrom !== null && wiringFrom.previewEndPosition !== null
  
  trackRender('WirePreview', `active:${isActive}`)
  
  if (!wiringFrom || !wiringFrom.previewEndPosition) return null
  
  return (
    <Wire3D
      start={wiringFrom.fromPosition}
      end={wiringFrom.previewEndPosition}
      isPreview
    />
  )
}

