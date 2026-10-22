import { useEffect } from 'react'

/** Shows each notice once after the first commit; render it after `<Toaster>`, which only shows toasts raised once it listens. */
export function BootNotices({ notices }: { notices: readonly (() => void)[] }) {
  useEffect(() => {
    for (const show of notices) show()
  }, [notices])
  return null
}
