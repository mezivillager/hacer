/* eslint-disable react-refresh/only-export-components -- icon registry (CHIP_ICON_MAP) co-located with its components for cohesion; splitting forces dual imports across the palette UI */
import type { ComponentType, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type IconProps = { className?: string }
const cls = (extra?: string) => cn('w-4 h-4', extra)
const STROKE = 1.5

/**
 * Compact SVG glyphs for the 16 Project 1 builtin chips.
 * Designs are intentionally schematic — the chip name decal on the 3D body
 * is the authoritative identifier. Icons use single-line strokes for clarity
 * at small sizes (16-24px).
 */

export const NandIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={cls(className)} fill="none" stroke="currentColor" strokeWidth={STROKE}>
    <path d="M3 6h6c5 0 9 3 9 6s-4 6-9 6H3V6z" />
    <circle cx="19" cy="12" r="2" />
  </svg>
)
export const NotIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={cls(className)} fill="none" stroke="currentColor" strokeWidth={STROKE}>
    <path d="M3 6l12 6-12 6V6z" />
    <circle cx="17" cy="12" r="2" />
  </svg>
)
export const AndIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={cls(className)} fill="none" stroke="currentColor" strokeWidth={STROKE}>
    <path d="M3 6h6c5 0 9 3 9 6s-4 6-9 6H3V6z" />
  </svg>
)
export const OrIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={cls(className)} fill="none" stroke="currentColor" strokeWidth={STROKE}>
    <path d="M3 6c2 2 2 6 0 12h4c6 0 12-3 14-6-2-3-8-6-14-6H3z" />
  </svg>
)
export const XorIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={cls(className)} fill="none" stroke="currentColor" strokeWidth={STROKE}>
    <path d="M5 6c2 2 2 6 0 12h4c6 0 12-3 14-6-2-3-8-6-14-6H5z" />
    <path d="M3 6c2 3 2 9 0 12" />
  </svg>
)

export const MuxIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={cls(className)} fill="none" stroke="currentColor" strokeWidth={STROKE}>
    <path d="M5 4l12 4v8l-12 4V4z" />
    <path d="M9 11l2 2 2-2" />
  </svg>
)
export const DMuxIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={cls(className)} fill="none" stroke="currentColor" strokeWidth={STROKE}>
    <path d="M19 4L7 8v8l12 4V4z" />
    <path d="M11 11l2-2 2 2" />
  </svg>
)

function With16Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cls(className)} fill="none" stroke="currentColor" strokeWidth={STROKE}>
      {children}
      <text x="14" y="22" fontSize="6" fill="currentColor" stroke="none">16</text>
    </svg>
  )
}
export const Not16Icon = ({ className }: IconProps) => (
  <With16Badge className={className}>
    <path d="M3 4l10 5-10 5V4z" />
    <circle cx="15" cy="9" r="1.6" />
  </With16Badge>
)
export const And16Icon = ({ className }: IconProps) => (
  <With16Badge className={className}>
    <path d="M3 4h5c4 0 7 2.5 7 5s-3 5-7 5H3V4z" />
  </With16Badge>
)
export const Or16Icon = ({ className }: IconProps) => (
  <With16Badge className={className}>
    <path d="M3 4c1.5 1.5 1.5 5 0 10h3c5 0 10-2.5 11-5-1-2.5-6-5-11-5H3z" />
  </With16Badge>
)
export const Mux16Icon = ({ className }: IconProps) => (
  <With16Badge className={className}>
    <path d="M4 3l9 3v6l-9 3V3z" />
    <path d="M7 8l2 1.5L11 8" />
  </With16Badge>
)

function NWayIcon({ count, className }: { count: 4 | 8; className?: string }) {
  const layers = count === 4 ? [2, 5, 8, 11] : [1, 3, 5, 7, 9, 11, 13, 15]
  return (
    <svg viewBox="0 0 24 24" className={cls(className)} fill="none" stroke="currentColor" strokeWidth={STROKE}>
      {layers.map((y) => <line key={y} x1="3" y1={y} x2="11" y2={y} />)}
      <path d="M12 1l8 4v14l-8 4V1z" />
      <text x="13" y="13" fontSize="5" fill="currentColor" stroke="none">{count}</text>
    </svg>
  )
}
export const Or8WayIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={cls(className)} fill="none" stroke="currentColor" strokeWidth={STROKE}>
    <path d="M3 4c1.5 1.5 1.5 5 0 10h3c5 0 10-2.5 11-5-1-2.5-6-5-11-5H3z" />
    <text x="13" y="22" fontSize="5.5" fill="currentColor" stroke="none">8w</text>
  </svg>
)
export const Mux4Way16Icon = ({ className }: IconProps) => <NWayIcon count={4} className={className} />
export const Mux8Way16Icon = ({ className }: IconProps) => <NWayIcon count={8} className={className} />
export const DMux4WayIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={cls(className)} fill="none" stroke="currentColor" strokeWidth={STROKE}>
    <path d="M12 1L4 5v14l8 4V1z" />
    {[2, 5, 8, 11].map((y) => <line key={y} x1="13" y1={y} x2="21" y2={y} />)}
    <text x="6" y="13" fontSize="5" fill="currentColor" stroke="none">4</text>
  </svg>
)
export const DMux8WayIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={cls(className)} fill="none" stroke="currentColor" strokeWidth={STROKE}>
    <path d="M12 1L4 5v14l8 4V1z" />
    {[1, 3, 5, 7, 9, 11, 13, 15].map((y) => <line key={y} x1="13" y1={y} x2="21" y2={y} />)}
    <text x="6" y="13" fontSize="5" fill="currentColor" stroke="none">8</text>
  </svg>
)

export const CHIP_ICON_FALLBACK = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={cls(className)} fill="none" stroke="currentColor" strokeWidth={STROKE}>
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <text x="7" y="16" fontSize="8" fill="currentColor" stroke="none">?</text>
  </svg>
)

export const CHIP_ICON_MAP: Record<string, ComponentType<IconProps>> = {
  Nand: NandIcon, Not: NotIcon, And: AndIcon, Or: OrIcon, Xor: XorIcon,
  Mux: MuxIcon, DMux: DMuxIcon,
  Not16: Not16Icon, And16: And16Icon, Or16: Or16Icon, Mux16: Mux16Icon,
  Or8Way: Or8WayIcon,
  Mux4Way16: Mux4Way16Icon, Mux8Way16: Mux8Way16Icon,
  DMux4Way: DMux4WayIcon, DMux8Way: DMux8WayIcon,
}
