import { useEffect, useState } from 'react'
import {
  displayVersionFromPackageVersion,
  fetchLatestReleaseTag,
  normalizeReleaseTag,
  readReleaseTagCache,
  writeReleaseTagCache,
} from '@/lib/githubRelease'

function buildFallbackDisplay(): string {
  return displayVersionFromPackageVersion(__BUILD_APP_VERSION__)
}

function initialDisplay(): string {
  if (typeof window === 'undefined') return buildFallbackDisplay()
  const cached = readReleaseTagCache()
  return cached ? normalizeReleaseTag(cached) : buildFallbackDisplay()
}

/**
 * Shows the latest GitHub release tag when the API is reachable; otherwise the
 * version baked in at build time from package.json.
 */
export function useAppReleaseVersion(): string {
  const [version, setVersion] = useState(initialDisplay)

  useEffect(() => {
    /* Initial state already applied a fresh cache; only network when missing */
    if (readReleaseTagCache()) return

    let cancelled = false
    const ac = new AbortController()

    void fetchLatestReleaseTag(ac.signal)
      .then((tag) => {
        if (cancelled || !tag) return
        writeReleaseTagCache(tag)
        setVersion(normalizeReleaseTag(tag))
      })
      .catch(() => {
        /* keep build fallback */
      })

    return () => {
      cancelled = true
      ac.abort()
    }
  }, [])

  return version
}
