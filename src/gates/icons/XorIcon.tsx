interface XorIconProps {
  size?: number
  color?: string
}

export function XorIcon({ size = 32, color = 'currentColor' }: XorIconProps) {
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
      
      {/* Extra curved line on input side (distinguishes XOR from OR) */}
      <path
        d="M4 6 Q10 16 4 26"
        stroke={color}
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      
      {/* XOR gate body (curved shape like OR) */}
      <path
        d="M8 6 Q14 16 8 26 Q20 26 28 16 Q20 6 8 6 Z"
        stroke={color}
        strokeWidth="2"
        fill="none"
        strokeLinejoin="round"
      />
      
      {/* Output line */}
      <line x1="28" y1="16" x2="30" y2="16" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
XorIcon.displayName = 'XorIcon'
