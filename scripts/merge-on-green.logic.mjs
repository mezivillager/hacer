// Pure logic for merge-on-green (#536). Red stub: the decision lands in the green commit.

const notImplemented = () => {
  throw new Error('merge-on-green.logic: not implemented')
}

export const EXIT = Object.freeze({ merged: 0, fail: 2, timeout: 3, 'give-up': 4 })
export const requiredContexts = notImplemented
export const decide = notImplemented
export const withRerunMarker = notImplemented
