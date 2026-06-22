type Variant = 'green' | 'yellow' | 'orange' | 'red' | 'blue' | 'gray' | 'purple' | 'indigo'

const styles: Record<Variant, string> = {
  green: 'bg-green-500/15 text-green-400 border-green-500/20',
  yellow: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  orange: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  red: 'bg-red-500/15 text-red-400 border-red-500/20',
  blue: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  gray: 'bg-white/[0.06] text-white/50 border-white/10',
  purple: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  indigo: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20',
}

type Props = {
  children: React.ReactNode
  variant?: Variant
  className?: string
}

export function Badge({ children, variant = 'gray', className = '' }: Props) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${styles[variant]} ${className}`}>
      {children}
    </span>
  )
}

export function statusBadgeVariant(status: string): Variant {
  const map: Record<string, Variant> = {
    prospect: 'gray',
    sampled: 'blue',
    active: 'green',
    damage_control: 'red',
  }
  return map[status] ?? 'gray'
}

export function creditVariant(rating: number | null): Variant {
  if (!rating) return 'gray'
  if (rating >= 4) return 'blue'
  if (rating === 3) return 'yellow'
  if (rating === 2) return 'orange'
  return 'red'
}
