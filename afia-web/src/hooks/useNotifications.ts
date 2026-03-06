/**
 * MODULE 9: useNotifications Hook
 *
 * Provides notification state and actions for the frontend.
 * Combines REST API polling with Supabase Realtime for instant push.
 *
 * Production concerns addressed:
 * - Unique Realtime channel per user (no cross-tab conflicts)
 * - Notification list capped at 50 in memory
 * - Toast throttle to prevent flooding
 * - Graceful cleanup on unmount / logout
 * - Auth-gated: does nothing until user is authenticated
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { apiClient } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { toast } from '../components/ui/Toast'

// ══════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════

export type NotificationType =
    | 'ORDER_CONFIRMED'
    | 'WAYBILL_UPLOADED'
    | 'DELIVERY_CONFIRMED'
    | 'PRE_RELEASE_WARNING'
    | 'PAYOUT_RELEASED'
    | 'DISPUTE_OPENED'
    | 'DISPUTE_RESOLVED'
    | 'KYC_STATUS'
    | 'NEW_ORDER'
    | 'SYSTEM'

export interface Notification {
    id: string
    type: NotificationType
    title: string
    body: string | null
    metadata: Record<string, unknown>
    is_read: boolean
    created_at: string
}

interface NotificationsResponse {
    notifications: Notification[]
    pagination: {
        page: number
        limit: number
        total: number
        total_pages: number
    }
}

interface UnreadCountResponse {
    count: number
}

// ══════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════

const POLL_INTERVAL_MS = 30_000 // 30s polling for unread count
const MAX_NOTIFICATIONS_IN_MEMORY = 50 // Cap to avoid memory bloat
const TOAST_COOLDOWN_MS = 3_000 // Min gap between toast notifications

// ══════════════════════════════════════════════
// HOOK
// ══════════════════════════════════════════════

export function useNotifications() {
    const { user } = useAuth()
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const lastToastRef = useRef<number>(0)
    // Track user.id for stable refs
    const userIdRef = useRef<string | null>(null)

    // Keep userIdRef in sync
    useEffect(() => {
        userIdRef.current = user?.id ?? null
    }, [user])

    // ── Fetch notifications ──
    const fetchNotifications = useCallback(async (page = 1) => {
        if (!userIdRef.current) return

        try {
            setLoading(true)
            setError(null)
            const data = await apiClient<NotificationsResponse>(
                `/api/notifications?page=${page}&limit=20`
            )
            setNotifications(data.notifications)
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch notifications'
            setError(message)
        } finally {
            setLoading(false)
        }
    }, [])

    // ── Fetch unread count ──
    const fetchUnreadCount = useCallback(async () => {
        if (!userIdRef.current) return

        try {
            const data = await apiClient<UnreadCountResponse>('/api/notifications/unread-count')
            setUnreadCount(data.count)
        } catch {
            // Silently fail — the badge just won't update
        }
    }, [])

    // ── Mark notifications as read ──
    const markRead = useCallback(async (id?: string) => {
        if (!userIdRef.current) return

        try {
            await apiClient('/api/notifications/mark-read', {
                method: 'POST',
                body: JSON.stringify(id ? { id } : {}),
            })

            if (id) {
                // Optimistic local update: mark single as read
                setNotifications(prev =>
                    prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
                )
                setUnreadCount(prev => Math.max(0, prev - 1))
            } else {
                // Optimistic: mark all as read
                setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
                setUnreadCount(0)
            }
        } catch (err) {
            console.error('Failed to mark notifications as read:', err)
            // Revert by re-fetching on error
            fetchUnreadCount()
        }
    }, [fetchUnreadCount])

    // ── Manual refresh ──
    const refresh = useCallback(() => {
        fetchNotifications()
        fetchUnreadCount()
    }, [fetchNotifications, fetchUnreadCount])

    // ── Initial fetch + polling ──
    useEffect(() => {
        if (!user) {
            setNotifications([])
            setUnreadCount(0)
            return
        }

        // Initial fetch
        fetchNotifications()
        fetchUnreadCount()

        // Poll every 30s for unread count (lightweight HEAD request)
        pollTimerRef.current = setInterval(fetchUnreadCount, POLL_INTERVAL_MS)

        return () => {
            if (pollTimerRef.current) {
                clearInterval(pollTimerRef.current)
                pollTimerRef.current = null
            }
        }
    }, [user, fetchNotifications, fetchUnreadCount])

    // ── Supabase Realtime subscription ──
    useEffect(() => {
        if (!user) return

        // Unique channel name per user to avoid cross-tab subscription collisions
        const channelName = `notifications-${user.id}`

        const channel = supabase
            .channel(channelName)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    const newNotification = payload.new as Notification

                    // Guard: validate the payload has required fields
                    if (!newNotification?.id || !newNotification?.title) return

                    // Prepend to the top, cap at MAX to avoid memory bloat
                    setNotifications(prev => {
                        const updated = [newNotification, ...prev]
                        return updated.length > MAX_NOTIFICATIONS_IN_MEMORY
                            ? updated.slice(0, MAX_NOTIFICATIONS_IN_MEMORY)
                            : updated
                    })
                    setUnreadCount(prev => prev + 1)

                    // Throttled toast: don't spam the user with rapid-fire notifications
                    const now = Date.now()
                    if (now - lastToastRef.current > TOAST_COOLDOWN_MS) {
                        lastToastRef.current = now

                        const variant =
                            newNotification.type === 'DISPUTE_OPENED' ? 'error'
                                : newNotification.type === 'PRE_RELEASE_WARNING' ? 'warning'
                                    : newNotification.type === 'PAYOUT_RELEASED' ? 'success'
                                        : 'info'

                        toast(newNotification.title, variant)
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [user])

    return {
        notifications,
        unreadCount,
        loading,
        error,
        markRead,
        refresh,
    }
}
