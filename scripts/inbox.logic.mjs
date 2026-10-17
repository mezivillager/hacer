export const INBOXES = [
  { prefix: 'FID', file: 'docs/harness/fidelity-inbox.md' },
  { prefix: 'HRN', file: 'docs/harness/harness-inbox.md' },
  { prefix: 'PRD', file: 'docs/harness/product-inbox.md' },
]

export const REVIEW_LABELS = []
export const REVIEW_LIST_LIMIT = 1000

export class InboxError extends Error {}

const notImplemented = () => {
  throw new Error('not implemented')
}

export const parseInbox = (_text, inbox) => ({ ...inbox, grammar: [], entries: [] })
export const listEntries = notImplemented
export const formatEntries = notImplemented
export const entryStatus = notImplemented
export const setStatus = notImplemented
export const reviewedIds = notImplemented
export const reviewIssue = notImplemented
export const queueReviews = notImplemented
