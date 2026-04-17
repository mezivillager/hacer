import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui-kit/tooltip'
import type { ReactNode } from 'react'

export function ComingSoon({
  children,
  label = 'Coming soon',
}: {
  children: ReactNode
  label?: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
