export type NodeNameValidationReason = 'empty' | 'invalid-format' | 'duplicate'

export type NodeNameValidationResult =
  | { ok: true; normalizedName: string }
  | { ok: false; reason: NodeNameValidationReason }

const HDL_IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/

function normalizeForCompare(name: string): string {
  return name.trim().toLowerCase()
}

/**
 * Validate and normalize a candidate node name.
 *
 * @param rawName - Untrusted user-entered name
 * @param existingNames - Names in the same node bucket (input or output)
 * @param currentName - Current node name when renaming an existing node
 */
export function validateNodeName(
  rawName: string,
  existingNames: string[],
  currentName?: string
): NodeNameValidationResult {
  const normalizedName = rawName.trim()
  if (normalizedName.length === 0) {
    return { ok: false, reason: 'empty' }
  }

  if (!HDL_IDENTIFIER_PATTERN.test(normalizedName)) {
    return { ok: false, reason: 'invalid-format' }
  }

  const normalizedCandidate = normalizeForCompare(normalizedName)
  const normalizedCurrent = currentName === undefined ? null : normalizeForCompare(currentName)

  const hasDuplicate = existingNames.some((name) => {
    const normalizedExisting = normalizeForCompare(name)
    if (normalizedCurrent !== null && normalizedExisting === normalizedCurrent) {
      return false
    }

    return normalizedExisting === normalizedCandidate
  })

  if (hasDuplicate) {
    return { ok: false, reason: 'duplicate' }
  }

  return { ok: true, normalizedName }
}
