/**
 * MODULE 9: NotificationCenter Component
 *
 * Bell icon with animated unread badge + dropdown panel.
 * Renders the notification feed with real-time updates.
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, CheckCheck, Inbox } from 'lucide-react'
import { useNotifications } from '../../hooks/useNotifications'
import NotificationItem from './NotificationItem'
import type { Notification } from '../../hooks/useNotifications'

// ══════════════════════════════════════════════
// ROUTE MAPPING — notification click → navigate
// ══════════════════════════════════════════════

function getNotificationRoute(notification: Notification, role?: string): string | null {
    const orderId = notification.metadata?.order_id as string | undefined

    switch (notification.type) {
        case 'ORDER_CONFIRMED':
        case 'WAYBILL_UPLOADED':
        case 'DELIVERY_CONFIRMED':
        case 'PRE_RELEASE_WARNING':
            return orderId ? `/dashboard/order/${orderId}` : '/dashboard'

        case 'NEW_ORDER':
            return '/vendor/orders'

        case 'PAYOUT_RELEASED':
            return '/vendor/orders'

        case 'DISPUTE_OPENED':
        case 'DISPUTE_RESOLVED':
            if (role === 'ADMIN' || role === 'SUPER_ADMIN') return '/admin'
            return orderId ? `/dashboard/order/${orderId}` : '/dashboard'

        case 'KYC_STATUS':
            return '/vendor/settings'

        default:
            return null
    }
}

// ══════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════

interface NotificationCenterProps {
    onNavigate?: (path: string) => void
    role?: string
    variant?: 'light' | 'dark'
}

export default function NotificationCenter({
    onNavigate,
    role,
    variant = 'dark',
}: NotificationCenterProps) {
    const { notifications, unreadCount, loading, markRead } = useNotifications()
    const [isOpen, setIsOpen] = useState(false)
    const panelRef = useRef<HTMLDivElement>(null)
    const buttonRef = useRef<HTMLButtonElement>(null)

    // ── Click outside to close ──
    const handleClickOutside = useCallback((e: MouseEvent) => {
        if (
            panelRef.current && !panelRef.current.contains(e.target as Node) &&
            buttonRef.current && !buttonRef.current.contains(e.target as Node)
        ) {
            setIsOpen(false)
        }
    }, [])

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen, handleClickOutside])

    // ── Escape key to close ──
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false)
        }
        if (isOpen) {
            document.addEventListener('keydown', handleEscape)
        }
        return () => document.removeEventListener('keydown', handleEscape)
    }, [isOpen])

    // ── Handle notification click ──
    const handleNotificationClick = (notification: Notification) => {
        // Mark as read
        if (!notification.is_read) {
            markRead(notification.id)
        }

        // Navigate to the relevant page
        const route = getNotificationRoute(notification, role)
        if (route && onNavigate) {
            onNavigate(route)
            setIsOpen(false)
        }
    }

    // ── Handle mark all read ──
    const handleMarkAllRead = () => {
        markRead()
    }

    const isLight = variant === 'light'

    return (
        <div className="relative" id="notification-center">
            {/* ── Bell Button ── */}
            <button
                ref={buttonRef}
                onClick={() => setIsOpen(!isOpen)}
                className={`
          p-2 rounded-lg relative cursor-pointer transition-colors duration-150
          ${isLight
                        ? 'hover:bg-navy/5 text-navy/70 hover:text-navy'
                        : 'hover:bg-white/10 text-white/80 hover:text-white'
                    }
        `}
                aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
                id="notification-bell"
            >
                <Bell className="w-5 h-5" />

                {/* Unread count badge */}
                <AnimatePresence>
                    {unreadCount > 0 && (
                        <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            className="
                absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px]
                bg-ruby text-white text-[10px] font-bold
                rounded-full flex items-center justify-center
                px-1 shadow-sm
              "
                        >
                            {unreadCount > 99 ? '99+' : unreadCount}

                            {/* Pulsing ring animation */}
                            <span className="absolute inset-0 rounded-full bg-ruby animate-ping opacity-30" />
                        </motion.span>
                    )}
                </AnimatePresence>
            </button>

            {/* ── Dropdown Panel ── */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        ref={panelRef}
                        initial={{ opacity: 0, y: -8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.96 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                        className="
              absolute right-0 top-full mt-2
              w-[380px] max-w-[calc(100vw-2rem)]
              bg-white rounded-2xl shadow-2xl
              border border-platinum/50
              overflow-hidden z-50
            "
                        id="notification-panel"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-platinum/40">
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-semibold text-navy">Notifications</h3>
                                {unreadCount > 0 && (
                                    <span className="px-1.5 py-0.5 bg-ruby/10 text-ruby text-[10px] font-bold rounded-full">
                                        {unreadCount} new
                                    </span>
                                )}
                            </div>

                            {unreadCount > 0 && (
                                <button
                                    onClick={handleMarkAllRead}
                                    className="
                    flex items-center gap-1 text-xs text-navy/50
                    hover:text-gold transition-colors cursor-pointer
                    font-medium
                  "
                                    id="notification-mark-all-read"
                                >
                                    <CheckCheck className="w-3.5 h-3.5" />
                                    Mark all read
                                </button>
                            )}
                        </div>

                        {/* Notification List */}
                        <div className="max-h-[420px] overflow-y-auto overscroll-contain">
                            {loading && notifications.length === 0 ? (
                                // Loading skeleton
                                <div className="p-4 space-y-3">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="flex items-start gap-3 animate-pulse">
                                            <div className="w-9 h-9 rounded-xl bg-platinum/40 shrink-0" />
                                            <div className="flex-1 space-y-2">
                                                <div className="h-3.5 bg-platinum/40 rounded w-3/4" />
                                                <div className="h-3 bg-platinum/30 rounded w-full" />
                                                <div className="h-2.5 bg-platinum/20 rounded w-1/4" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : notifications.length === 0 ? (
                                // Empty state
                                <div className="py-12 px-4 flex flex-col items-center text-center">
                                    <div className="w-14 h-14 rounded-2xl bg-platinum/30 flex items-center justify-center mb-3">
                                        <Inbox className="w-7 h-7 text-navy/20" />
                                    </div>
                                    <p className="text-sm font-medium text-navy/40">No notifications yet</p>
                                    <p className="text-xs text-navy/25 mt-1">
                                        We'll notify you when something happens
                                    </p>
                                </div>
                            ) : (
                                // Notification items
                                <div className="divide-y divide-platinum/20">
                                    {notifications.map(notification => (
                                        <NotificationItem
                                            key={notification.id}
                                            notification={notification}
                                            onClick={handleNotificationClick}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        {notifications.length > 0 && (
                            <div className="border-t border-platinum/40 px-4 py-2.5">
                                <p className="text-[10px] text-navy/30 text-center font-medium">
                                    Showing last {notifications.length} notifications
                                </p>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
