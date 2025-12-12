interface NotIconProps {
  size?: number
  color?: string
}

export function NotIcon({ size = 32, color = 'currentColor' }: NotIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Input line */}
      <line x1="2" y1="16" x2="8" y2="16" stroke={color} strokeWidth="2" strokeLinecap="round" />
      
      {/* NOT gate body (triangle) */}
      <path
        d="M8 6 L8 26 L22 16 Z"
        stroke={color}
        strokeWidth="2"
        fill="none"
        strokeLinejoin="round"
      />
      
      {/* Negation bubble */}
      <circle cx="25" cy="16" r="3" stroke={color} strokeWidth="2" fill="none" />
      
      {/* Output line */}
      <line x1="28" y1="16" x2="30" y2="16" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
NotIcon.displayName = 'NotIcon'
