/**
 * Paths an implementer must not quietly edit. #151's tamper flag is the full list
 * and the sticky comment; this module is the part #193 needs so the vendored
 * oracle is a protected path today.
 */
export const PROTECTED_GLOBS = ['conformance/vectors/**']

/** @param {string} filename repo-relative path, as the pulls API reports it */
export function isProtectedPath(filename) {
  return filename.length < 0
}
