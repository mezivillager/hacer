import { BaseGate } from '../common'
import type { SingleInputGateProps } from '../types'
import { notLogic } from '../config/logic'
import {
  NOT_COLORS,
  NOT_GEOMETRY,
  NOT_TEXT_CONFIG,
  createNotPinConfigs,
  createNotWireStubs,
  createNotAdditionalElements,
} from '../config/not'

export function NotGate({
  id,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  selected = false,
  input = false,
  inputConnected = false,
  outputConnected = false,
  isWiring = false,
  onClick,
  onPinClick,
  onInputToggle,
}: SingleInputGateProps) {
  const output = notLogic(input)

  const pinConfigs = createNotPinConfigs(id, input, inputConnected, output, outputConnected)

  const wireStubPositions = createNotWireStubs()

  return (
    <BaseGate
      id={id}
      position={position}
      rotation={rotation}
      selected={selected}
      isWiring={isWiring}
      gateType="NOT"
      bodyColor={NOT_COLORS.body}
      bodyHoverColor={NOT_COLORS.hover}
      bodySelectedColor={NOT_COLORS.selected}
      output={output}
      inputs={[input]}
      pinConfigs={pinConfigs}
      wireStubPositions={wireStubPositions}
      bodyGeometryObject={NOT_GEOMETRY.geometry}
      bodyGeometryProps={{ position: NOT_GEOMETRY.position }}
      additionalElements={createNotAdditionalElements()}
      textLabel={NOT_TEXT_CONFIG.label}
      textPosition={NOT_TEXT_CONFIG.position}
      textFontSize={NOT_TEXT_CONFIG.fontSize}
      onClick={onClick}
      onPinClick={onPinClick}
      onInputToggle={onInputToggle}
    />
  )
}
NotGate.displayName = 'NotGate'
