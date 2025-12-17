import { BaseGate } from '../common'
import type { TwoInputGateProps } from '../types'
import { andLogic } from '../config/logic'
import {
  AND_COLORS,
  AND_GEOMETRY,
  AND_TEXT_CONFIG,
  createAndPinConfigs,
  createAndWireStubs,
} from '../config/and'

export function AndGate({
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
  const output = andLogic(inputA, inputB)

  const pinConfigs = createAndPinConfigs(
    id,
    inputA,
    inputB,
    inputAConnected,
    inputBConnected,
    output,
    outputConnected
  )

  const wireStubPositions = createAndWireStubs()

  return (
    <BaseGate
      id={id}
      position={position}
      rotation={rotation}
      selected={selected}
      isWiring={isWiring}
      gateType="AND"
      bodyColor={AND_COLORS.body}
      bodyHoverColor={AND_COLORS.hover}
      bodySelectedColor={AND_COLORS.selected}
      output={output}
      inputs={[inputA, inputB]}
      pinConfigs={pinConfigs}
      wireStubPositions={wireStubPositions}
      bodyGeometry={<boxGeometry args={AND_GEOMETRY.args} />}
      textLabel={AND_TEXT_CONFIG.label}
      textPosition={AND_TEXT_CONFIG.position}
      textFontSize={AND_TEXT_CONFIG.fontSize}
      onClick={onClick}
      onPinClick={onPinClick}
      onInputToggle={onInputToggle}
    />
  )
}
AndGate.displayName = 'AndGate'
