/**
 * MODULE 9: NotificationItem Component
 *
 * Individual notification row with type-specific icon, accent color,
 * unread indicator, and relative timestamp.
 */

import { motion } from 'framer-motion'
import {
    ShoppingBag, Truck, CheckCircle, AlertTriangle,
    DollarSign, Shield, Bell, UserCheck, Package,
} from 'lucide-react'
import type { NotificationType, Notification } from '../../hooks/useNotifications'

// ══════════════════════════════════════════════
// TYPE → ICON + ACCENT MAPPING
// ══════════════════════════════════════════════

const TYPE_CONFIG: Record<NotificationType, {
    icon: typeof Bell
    accentClass: string
    bgClass: string
}> = {
    ORDER_CONFIRMED: {
        icon: ShoppingBag,
        accentClass: 'text-neoa-emerald',
        bgClass: 'bg-neoa-emerald/10',
    },
    NEW_ORDER: {
        icon: Package,
        accentClass: 'text-gold',
        bgClass: 'bg-gold/10',
    },
    WAYBILL_UPLOADED: {
        icon: Truck,
        accentClass: 'text-sky-500',
        bgClass: 'bg-sky-500/10',
    },
    DELIVERY_CONFIRMED: {
        icon: CheckCircle,
        accentClass: 'text-neoa-emerald',
        bgClass: 'bg-neoa-emerald/10',
    },
    PRE_RELEASE_WARNING: {
        icon: AlertTriangle,
        accentClass: 'text-amber-500',
        bgClass: 'bg-amber-500/10',
    },
    PAYOUT_RELEASED: {
        icon: DollarSign,
        accentClass: 'text-neoa-emerald',
        bgClass: 'bg-neoa-emerald/10',
    },
    DISPUTE_OPENED: {
        icon: AlertTriangle,
        accentClass: 'text-ruby',
        bgClass: 'bg-ruby/10',
    },
    DISPUTE_RESOLVED: {
        icon: Shield,
        accentClass: 'text-neoa-emerald',
        bgClass: 'bg-neoa-emerald/10',
    },
    KYC_STATUS: {
        icon: UserCheck,
        accentClass: 'text-gold',
        bgClass: 'bg-gold/10',
    },
    SYSTEM: {
        icon: Bell,
        accentClass: 'text-platinum-dark',
        bgClass: 'bg-platinum/30',
    },
}

// ══════════════════════════════════════════════
// RELATIVE TIME FORMATTER
// ══════════════════════════════════════════════

function getRelativeTime(dateStr: string): string {
    if (!dateStr) return ''

    const now = Date.now()
    const then = new Date(dateStr).getTime()

    // Guard against invalid dates
    if (isNaN(then)) return ''

    const diffMs = now - then

    if (diffMs < 0) return 'just now'

    const seconds = Math.floor(diffMs / 1000)
    if (seconds < 60) return 'just now'

    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`

    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`

    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d ago`

    const weeks = Math.floor(days / 7)
    if (weeks < 5) return `${weeks}w ago`

    return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
    })
}

// ══════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════

interface NotificationItemProps {
    notification: Notification
    onClick?: (notification: Notification) => void
}

export default function NotificationItem({ notification, onClick }: NotificationItemProps) {
    const config = TYPE_CONFIG[notification.type] || TYPE_CONFIG.SYSTEM
    const Icon = config.icon

    return (
        <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => onClick?.(notification)}
            className={`
        w-full flex items-start gap-3 px-4 py-3 text-left
        transition-colors duration-150 cursor-pointer
        hover:bg-platinum-light/60 relative group
        ${!notification.is_read ? 'bg-gold/[0.03]' : ''}
      `}
        >
            {/* Unread indicator dot */}
            {!notification.is_read && (
                <span className="absolute top-3.5 left-1 w-1.5 h-1.5 rounded-full bg-gold" />
            )}

            {/* Type icon */}
            <div className={`
        shrink-0 w-9 h-9 rounded-xl flex items-center justify-center mt-0.5
        ${config.bgClass}
      `}>
                <Icon className={`w-[18px] h-[18px] ${config.accentClass}`} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <p className={`
          text-sm leading-snug line-clamp-1
          ${notification.is_read ? 'text-navy/70 font-normal' : 'text-navy font-semibold'}
        `}>
                    {notification.title}
                </p>
                {notification.body && (
                    <p className="text-xs text-navy/50 mt-0.5 line-clamp-2 leading-relaxed">
                        {notification.body}
                    </p>
                )}
                <p className="text-[10px] text-navy/35 mt-1 font-medium">
                    {getRelativeTime(notification.created_at)}
                </p>
            </div>
        </motion.button>
    )
}
