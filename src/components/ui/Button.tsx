import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'ghost' | 'danger'

const variants: Record<Variant, string> = {
  primary: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)]',
  ghost: 'bg-white/[0.06] hover:bg-white/[0.10] text-white/80 border border-white/[0.08]',
  danger: 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/20',
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  children: ReactNode
  size?: 'sm' | 'md'
}

export function Button({ variant = 'ghost', children, className = '', size = 'md', ...props }: Props) {
  return (
    <button
      {...props}
      className={`
        inline-flex items-center gap-2 rounded-xl font-medium transition-all duration-150
        ${size === 'sm' ? 'px-3 py-1.5 text-sm' : 'px-4 py-2 text-sm'}
        ${variants[variant]}
        disabled:opacity-40 disabled:cursor-not-allowed
        ${className}
      `}
    >
      {children}
    </button>
  )
}
