import { BaseGate } from '../common'
import type { TwoInputGateProps } from '../types'
import { nandLogic } from '../config/logic'
import {
  NAND_COLORS,
  NAND_TEXT_CONFIG,
  NAND_GEOMETRY,
} from '../config/nand-constants'
import {
  createNandPinConfigs,
  createNandWireStubs,
} from '../config/nand-helpers'
import { NandBubble } from '../config/nand'

export function NandGate({
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
  const output = nandLogic(inputA, inputB)

  const pinConfigs = createNandPinConfigs(
    id,
    inputA,
    inputB,
    inputAConnected,
    inputBConnected,
    output,
    outputConnected
  )

  const wireStubPositions = createNandWireStubs()

  return (
    <BaseGate
      id={id}
      position={position}
      rotation={rotation}
      selected={selected}
      isWiring={isWiring}
      gateType="NAND"
      bodyColor={NAND_COLORS.body}
      bodyHoverColor={NAND_COLORS.hover}
      bodySelectedColor={NAND_COLORS.selected}
      output={output}
      inputs={[inputA, inputB]}
      pinConfigs={pinConfigs}
      wireStubPositions={wireStubPositions}
      bodyGeometry={<boxGeometry args={NAND_GEOMETRY.args} />}
      additionalElements={<NandBubble />}
      textLabel={NAND_TEXT_CONFIG.label}
      textPosition={NAND_TEXT_CONFIG.position}
      textFontSize={NAND_TEXT_CONFIG.fontSize}
      onClick={onClick}
      onPinClick={onPinClick}
      onInputToggle={onInputToggle}
    />
  )
}
NandGate.displayName = 'NandGate'
