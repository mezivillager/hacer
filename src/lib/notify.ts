type NotifyOpts = { description?: string; duration?: number }
type NotifyFn = (message: string, opts?: NotifyOpts) => void

const stubLog = (level: string): NotifyFn => (msg, opts) => {
  // Temporary stub; replaced by Sonner-backed implementation in Phase B.
  console.warn(`[notify.${level}]`, msg, opts ?? '')
}

export const notify = {
  success: stubLog('success'),
  info: stubLog('info'),
  error: stubLog('error'),
  warning: stubLog('warning'),
}
