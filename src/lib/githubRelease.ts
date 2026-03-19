/** Latest GitHub release API (public repo, no token). */
export const LATEST_GITHUB_RELEASE_URL =
  'https://api.github.com/repos/mezivillager/hacer/releases/latest'

const CACHE_KEY = 'hacer-github-release-tag'
const CACHE_TTL_MS = 60 * 60 * 1000

interface ReleaseCachePayload {
  tag: string
  fetchedAt: number
}

/** Normalize API `tag_name` (e.g. `v1.2.3`) for display. */
export function normalizeReleaseTag(tagName: string): string {
  const t = tagName.trim()
  if (!t) return ''
  return t.startsWith('v') ? t : `v${t}`
}

/** Display version from package.json / build (semver without leading v). */
export function displayVersionFromPackageVersion(version: string): string {
  const v = version.trim()
  if (!v) return 'v0.0.0'
  return v.startsWith('v') ? v : `v${v}`
}

export function readReleaseTagCache(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ReleaseCachePayload
    if (typeof parsed.tag !== 'string' || typeof parsed.fetchedAt !== 'number') return null
    if (Date.now() - parsed.fetchedAt > CACHE_TTL_MS) return null
    return parsed.tag
  } catch {
    return null
  }
}

export function writeReleaseTagCache(tag: string): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ tag, fetchedAt: Date.now() } satisfies ReleaseCachePayload),
    )
  } catch {
    /* quota / private mode */
  }
}

export async function fetchLatestReleaseTag(signal?: AbortSignal): Promise<string | null> {
  const res = await fetch(LATEST_GITHUB_RELEASE_URL, {
    signal,
    headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
  })
  if (!res.ok) return null
  const data = (await res.json()) as { tag_name?: string }
  const tag = data.tag_name
  return typeof tag === 'string' && tag.trim() !== '' ? tag.trim() : null
}
