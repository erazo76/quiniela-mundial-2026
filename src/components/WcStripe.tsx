'use client'

interface Props {
  height?: number
  className?: string
}

export function WcStripe({ height = 4, className = '' }: Props) {
  return (
    <div
      className={className}
      style={{
        height,
        background: 'var(--wc-stripe-gradient)',
        flexShrink: 0,
      }}
    />
  )
}
