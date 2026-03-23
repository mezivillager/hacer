import { BaseGate } from '../common'
import type { TwoInputGateProps } from '../types'
import { xorLogic } from '../config/logic'
import {
  XOR_COLORS,
  XOR_TEXT_CONFIG,
} from '../config/xor-constants'
import {
  XOR_GEOMETRY,
  createXorPinConfigs,
  createXorWireStubs,
} from '../config/xor-helpers'
import { XorLine } from '../config/xor'

export function XorGate({
  id,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  selected = false,
  inputA = 0,
  inputB = 0,
  inputAConnected = false,
  inputBConnected = false,
  outputConnected = false,
  isWiring = false,
  onClick,
  onPinClick,
  onInputToggle,
}: TwoInputGateProps) {
  const output = xorLogic(inputA, inputB)

  const pinConfigs = createXorPinConfigs(
    id,
    inputA,
    inputB,
    inputAConnected,
    inputBConnected,
    output,
    outputConnected
  )

  const wireStubPositions = createXorWireStubs()

  return (
    <BaseGate
      id={id}
      position={position}
      rotation={rotation}
      selected={selected}
      isWiring={isWiring}
      gateType="XOR"
      bodyColor={XOR_COLORS.body}
      bodyHoverColor={XOR_COLORS.hover}
      bodySelectedColor={XOR_COLORS.selected}
      output={output}
      inputs={[inputA, inputB]}
      pinConfigs={pinConfigs}
      wireStubPositions={wireStubPositions}
      bodyGeometryObject={XOR_GEOMETRY.geometry}
      bodyGeometryProps={{ position: XOR_GEOMETRY.position }}
      additionalElements={<XorLine />}
      textLabel={XOR_TEXT_CONFIG.label}
      textPosition={XOR_TEXT_CONFIG.position}
      textFontSize={XOR_TEXT_CONFIG.fontSize}
      onClick={onClick}
      onPinClick={onPinClick}
      onInputToggle={onInputToggle}
    />
  )
}
XorGate.displayName = 'XorGate'
