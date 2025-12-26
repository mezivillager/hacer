interface OrIconProps {
  size?: number
  color?: string
}

export function OrIcon({ size = 32, color = 'currentColor' }: OrIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Input lines */}
      <line x1="2" y1="10" x2="10" y2="10" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="2" y1="22" x2="10" y2="22" stroke={color} strokeWidth="2" strokeLinecap="round" />

      {/* OR gate body (curved shape) */}
      <path
        d="M6 6 Q12 16 6 26 Q18 26 26 16 Q18 6 6 6 Z"
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
OrIcon.displayName = 'OrIcon'
