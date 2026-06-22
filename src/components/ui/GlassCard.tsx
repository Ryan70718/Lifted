import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
  className?: string
  hover?: boolean
  onClick?: () => void
}

export function GlassCard({ children, className = '', hover = false, onClick }: Props) {
  return (
    <div
      onClick={onClick}
      className={`
        rounded-2xl border border-white/[0.08] bg-white/[0.04]
        backdrop-blur-[20px] shadow-[0_4px_24px_rgba(0,0,0,0.3)]
        ${hover ? 'transition-all duration-200 cursor-pointer hover:bg-white/[0.07] hover:border-white/[0.14] hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)] hover:-translate-y-0.5' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  )
}
