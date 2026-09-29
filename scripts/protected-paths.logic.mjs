/**
 * Paths an implementer must not quietly edit. #151's tamper flag is the full list
 * and the sticky comment; this module is the part #193 needs so the vendored
 * oracle is a protected path today, plus the legacy app's characterization
 * goldens (#331), which record behaviour that is deleted after they are taken.
 */
export const PROTECTED_GLOBS = ['conformance/vectors/**', '**/__snapshots__/characterization/**']

const CHARACTERIZATION = /(^|\/)__snapshots__\/characterization\//

/** @param {string} filename repo-relative path, as the pulls API reports it */
export function isProtectedPath(filename) {
  const path = filename.replaceAll('\\', '/')
  return path.startsWith('conformance/vectors/') || CHARACTERIZATION.test(path)
}
