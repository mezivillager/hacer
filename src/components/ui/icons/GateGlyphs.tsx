import { cn } from '@/lib/utils'

type IconProps = { className?: string }

export const NandGateIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={cn('w-4 h-4', className)} fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M3 6h6c5 0 9 3 9 6s-4 6-9 6H3V6z" />
    <circle cx="19" cy="12" r="2" />
  </svg>
)

export const AndGateIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={cn('w-4 h-4', className)} fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M3 6h6c5 0 9 3 9 6s-4 6-9 6H3V6z" />
  </svg>
)

export const OrGateIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={cn('w-4 h-4', className)} fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M3 6c2 2 2 6 0 12h4c6 0 12-3 14-6-2-3-8-6-14-6H3z" />
  </svg>
)

export const NotGateIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={cn('w-4 h-4', className)} fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M3 6l12 6-12 6V6z" />
    <circle cx="17" cy="12" r="2" />
  </svg>
)

export const NorGateIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={cn('w-4 h-4', className)} fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M3 6c2 2 2 6 0 12h4c5 0 11-3 13-6-2-3-8-6-13-6H3z" />
    <circle cx="19" cy="12" r="2" />
  </svg>
)

export const XorGateIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={cn('w-4 h-4', className)} fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M5 6c2 2 2 6 0 12h4c6 0 12-3 14-6-2-3-8-6-14-6H5z" />
    <path d="M3 6c2 3 2 9 0 12" />
  </svg>
)

export const XnorGateIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={cn('w-4 h-4', className)} fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M5 6c2 2 2 6 0 12h4c5 0 11-3 13-6-2-3-8-6-13-6H5z" />
    <path d="M3 6c2 3 2 9 0 12" />
    <circle cx="19" cy="12" r="2" />
  </svg>
)
