interface AndIconProps {
  size?: number
  color?: string
}

export function AndIcon({ size = 32, color = 'currentColor' }: AndIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Input lines */}
      <line x1="2" y1="10" x2="8" y2="10" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="2" y1="22" x2="8" y2="22" stroke={color} strokeWidth="2" strokeLinecap="round" />

      {/* AND gate body (D-shape) */}
      <path
        d="M8 6 L8 26 L16 26 A10 10 0 0 0 16 6 L8 6 Z"
        stroke={color}
        strokeWidth="2"
        fill="none"
        strokeLinejoin="round"
      />

      {/* Output line */}
      <line x1="26" y1="16" x2="30" y2="16" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
AndIcon.displayName = 'AndIcon'
