type BadgeVariant = 'verified' | 'pending' | 'disputed' | 'locked' | 'released' | 'default'

interface BadgeProps {
    variant?: BadgeVariant
    children: React.ReactNode
    dot?: boolean
    className?: string
}

const variantStyles: Record<BadgeVariant, string> = {
    verified: 'bg-neoa-emerald/10 text-neoa-emerald border-neoa-emerald/30',
    pending: 'bg-gold/10 text-gold-dark border-gold/30',
    disputed: 'bg-ruby/10 text-ruby border-ruby/30',
    locked: 'bg-navy/10 text-navy border-navy/20',
    released: 'bg-neoa-emerald/10 text-neoa-emerald border-neoa-emerald/30',
    default: 'bg-platinum-light text-navy border-platinum-dark/30',
}

const dotColors: Record<BadgeVariant, string> = {
    verified: 'bg-neoa-emerald',
    pending: 'bg-gold',
    disputed: 'bg-ruby',
    locked: 'bg-navy',
    released: 'bg-neoa-emerald',
    default: 'bg-platinum-dark',
}

export default function Badge({ variant = 'default', children, dot = false, className = '' }: BadgeProps) {
    return (
        <span
            className={`
        inline-flex items-center gap-1.5 px-2.5 py-0.5
        text-xs font-medium rounded-full border
        ${variantStyles[variant]}
        ${className}
      `}
        >
            {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
            {children}
        </span>
    )
}
