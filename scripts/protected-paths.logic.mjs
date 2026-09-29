/**
 * Paths an implementer must not quietly edit. #151's tamper flag is the full list
 * and the sticky comment; this module is the part #193 needs so the vendored
 * oracle is a protected path today, plus the legacy app's characterization
 * goldens (#331), which record behaviour that is deleted after they are taken.
 */
/** Each protected glob with the reason it is protected, for the warning that names it. */
export const PROTECTED_PATHS = [
  {
    glob: 'conformance/vectors/**',
    reason: 'held-out oracle (#193)',
    matches: (path) => path.startsWith('conformance/vectors/'),
  },
  {
    glob: '**/__snapshots__/characterization/**',
    reason: 'characterization golden: records legacy behaviour deleted after capture (#331)',
    matches: (path) => /(^|\/)__snapshots__\/characterization\//.test(path),
  },
]

export const PROTECTED_GLOBS = PROTECTED_PATHS.map((entry) => entry.glob)

/**
 * The protected entry a file falls under, or undefined.
 * @param {string} filename repo-relative path, as the pulls API reports it
 */
export function protectedEntryFor(filename) {
  const path = filename.replaceAll('\\', '/')
  return PROTECTED_PATHS.find((entry) => entry.matches(path))
}

/** @param {string} filename repo-relative path, as the pulls API reports it */
export function isProtectedPath(filename) {
  return protectedEntryFor(filename) !== undefined
}
