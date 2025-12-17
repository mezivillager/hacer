import { BaseGate } from '../common'
import type { TwoInputGateProps } from '../types'
import { orLogic } from '../config/logic'
import {
  OR_COLORS,
  OR_GEOMETRY,
  OR_TEXT_CONFIG,
  createOrPinConfigs,
  createOrWireStubs,
} from '../config/or'

export function OrGate({
  id,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  selected = false,
  inputA = false,
  inputB = false,
  inputAConnected = false,
  inputBConnected = false,
  outputConnected = false,
  isWiring = false,
  onClick,
  onPinClick,
  onInputToggle,
}: TwoInputGateProps) {
  const output = orLogic(inputA, inputB)

  const pinConfigs = createOrPinConfigs(
    id,
    inputA,
    inputB,
    inputAConnected,
    inputBConnected,
    output,
    outputConnected
  )

  const wireStubPositions = createOrWireStubs()

  return (
    <BaseGate
      id={id}
      position={position}
      rotation={rotation}
      selected={selected}
      isWiring={isWiring}
      gateType="OR"
      bodyColor={OR_COLORS.body}
      bodyHoverColor={OR_COLORS.hover}
      bodySelectedColor={OR_COLORS.selected}
      output={output}
      inputs={[inputA, inputB]}
      pinConfigs={pinConfigs}
      wireStubPositions={wireStubPositions}
      bodyGeometryObject={OR_GEOMETRY.geometry}
      bodyGeometryProps={{ position: OR_GEOMETRY.position }}
      textLabel={OR_TEXT_CONFIG.label}
      textPosition={OR_TEXT_CONFIG.position}
      textFontSize={OR_TEXT_CONFIG.fontSize}
      onClick={onClick}
      onPinClick={onPinClick}
      onInputToggle={onInputToggle}
    />
  )
}
OrGate.displayName = 'OrGate'
