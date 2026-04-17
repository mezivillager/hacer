import { toast } from 'sonner'

type NotifyOpts = { description?: string; duration?: number }

export const notify = {
  success: (msg: string, opts?: NotifyOpts) => toast.success(msg, opts),
  info: (msg: string, opts?: NotifyOpts) => toast.info(msg, opts),
  error: (msg: string, opts?: NotifyOpts) => toast.error(msg, opts),
  warning: (msg: string, opts?: NotifyOpts) => toast.warning(msg, opts),
}
