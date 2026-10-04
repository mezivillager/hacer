export function extractPackageClaims() {
  return []
}

export function parseManifest() {
  return { direct: new Set(), locked: new Map() }
}

export function versionMatches() {
  return false
}

export function checkPackageClaims() {
  return []
}

export function pathIndex() {
  return () => false
}

export function checkIssueFacts() {
  return { packages: [], paths: [] }
}

export function formatIssueFacts() {
  return ''
}
