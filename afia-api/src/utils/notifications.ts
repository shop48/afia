/**
 * MODULE 9: Notification Service
 * 
 * Server-side helpers to create notifications in the database.
 * Used by webhook handlers and API route handlers to notify
 * buyers, vendors, and admins of important events.
 * 
 * IMPORTANT: Always pass the SERVICE-ROLE Supabase client.
 * The INSERT RLS policy restricts inserts to service_role only.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

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

export interface NotificationPayload {
    userId: string
    type: NotificationType
    title: string
    body?: string
    metadata?: Record<string, unknown>
}

// ══════════════════════════════════════════════
// SANITIZATION + GUARDS
// ══════════════════════════════════════════════

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Truncate a string to a max length and strip control characters */
function sanitizeText(text: string, maxLen: number): string {
    // Strip zero-width / control chars (keep newlines for body)
    const cleaned = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    return cleaned.length > maxLen ? cleaned.slice(0, maxLen) : cleaned
}

/** Ensure metadata doesn't exceed a reasonable size (8KB JSON) */
function sanitizeMetadata(meta: Record<string, unknown>): Record<string, unknown> {
    const json = JSON.stringify(meta)
    if (json.length > 8192) {
        console.warn('[Notifications] Metadata exceeds 8KB, truncating to basic fields')
        // Keep only essential keys
        return {
            order_id: meta.order_id,
            product_title: meta.product_title,
        }
    }
    return meta
}

// ══════════════════════════════════════════════
// NOTIFICATION TEMPLATES
// ══════════════════════════════════════════════

interface OrderContext {
    orderId?: string
    productTitle?: string
    amount?: number
    currency?: string
    vendorName?: string
    buyerName?: string
}

/**
 * Generate notification title + body from event type and order context.
 * Keeps all user-facing copy centralized in one place.
 */
export function getNotificationContent(
    type: NotificationType,
    ctx: OrderContext = {}
): { title: string; body: string } {
    const product = ctx.productTitle || 'your item'
    const amount = ctx.amount ? `${ctx.currency || '₦'}${ctx.amount.toLocaleString()}` : ''

    switch (type) {
        case 'ORDER_CONFIRMED':
            return {
                title: 'Order Confirmed',
                body: `Your order for ${product} has been confirmed and payment received.${amount ? ` Amount: ${amount}` : ''}`,
            }
        case 'NEW_ORDER':
            return {
                title: 'New Order Received',
                body: `You have a new order for ${product}.${amount ? ` Amount: ${amount}` : ''} Please prepare for shipment.`,
            }
        case 'WAYBILL_UPLOADED':
            return {
                title: 'Item Shipped',
                body: `Your order for ${product} has been shipped. Track your delivery in your dashboard.`,
            }
        case 'DELIVERY_CONFIRMED':
            return {
                title: 'Delivery Confirmed',
                body: `Delivery of ${product} has been confirmed. The 48-hour review window has started.`,
            }
        case 'PRE_RELEASE_WARNING':
            return {
                title: 'Payment Release in 24 Hours',
                body: `Payment for ${product} will be automatically released to the vendor in 24 hours. Report any issues now.`,
            }
        case 'PAYOUT_RELEASED':
            return {
                title: 'Payout Released',
                body: `Your payout for ${product} has been released.${amount ? ` Amount: ${amount}` : ''}`,
            }
        case 'DISPUTE_OPENED':
            return {
                title: 'Dispute Filed',
                body: `A dispute has been filed for ${product}. Our team will review and resolve this shortly.`,
            }
        case 'DISPUTE_RESOLVED':
            return {
                title: 'Dispute Resolved',
                body: `The dispute for ${product} has been resolved. Check your dashboard for details.`,
            }
        case 'KYC_STATUS':
            return {
                title: 'KYC Verification Update',
                body: 'Your identity verification status has been updated. Check your settings for details.',
            }
        case 'SYSTEM':
        default:
            return {
                title: 'System Notification',
                body: 'You have a new notification from Neoa.',
            }
    }
}

// ══════════════════════════════════════════════
// DATABASE OPERATIONS
// ══════════════════════════════════════════════

/**
 * Insert a single notification into the database.
 * MUST use the service-role client to bypass RLS.
 */
export async function createNotification(
    supabase: SupabaseClient,
    payload: NotificationPayload
): Promise<{ success: boolean; error?: string }> {
    // Validate userId is a real UUID
    if (!payload.userId || !UUID_REGEX.test(payload.userId)) {
        console.error(`[Notifications] Invalid userId: ${payload.userId}`)
        return { success: false, error: 'Invalid userId' }
    }

    const { error } = await supabase
        .from('notifications')
        .insert({
            user_id: payload.userId,
            type: payload.type,
            title: sanitizeText(payload.title, 200),
            body: payload.body ? sanitizeText(payload.body, 2000) : '',
            metadata: payload.metadata ? sanitizeMetadata(payload.metadata) : {},
        })

    if (error) {
        console.error(`[Notifications] Failed to create notification for user ${payload.userId}:`, error.message)
        return { success: false, error: error.message }
    }

    return { success: true }
}

/**
 * Insert multiple notifications at once (e.g. notify buyer + vendor on the same event).
 * Each item in the array becomes a separate row.
 * MUST use the service-role client.
 */
export async function createBulkNotifications(
    supabase: SupabaseClient,
    payloads: NotificationPayload[]
): Promise<{ success: boolean; inserted: number; errors: string[] }> {
    if (payloads.length === 0) {
        return { success: true, inserted: 0, errors: [] }
    }

    // Guard: cap bulk inserts at 10 to prevent abuse
    if (payloads.length > 10) {
        console.warn(`[Notifications] Bulk insert capped at 10, received ${payloads.length}`)
        payloads = payloads.slice(0, 10)
    }

    // Filter out any payloads with invalid user IDs
    const validPayloads = payloads.filter(p => {
        if (!p.userId || !UUID_REGEX.test(p.userId)) {
            console.warn(`[Notifications] Skipping notification with invalid userId: ${p.userId}`)
            return false
        }
        return true
    })

    if (validPayloads.length === 0) {
        return { success: true, inserted: 0, errors: ['All payloads had invalid userIds'] }
    }

    const rows = validPayloads.map(p => ({
        user_id: p.userId,
        type: p.type,
        title: sanitizeText(p.title, 200),
        body: p.body ? sanitizeText(p.body, 2000) : '',
        metadata: p.metadata ? sanitizeMetadata(p.metadata) : {},
    }))

    const { error } = await supabase
        .from('notifications')
        .insert(rows)

    if (error) {
        console.error('[Notifications] Bulk insert failed:', error.message)
        return { success: false, inserted: 0, errors: [error.message] }
    }

    return { success: true, inserted: rows.length, errors: [] }
}

/**
 * Convenience: create a notification using a template.
 * Generates title/body from the event type + context, then inserts.
 * MUST use the service-role client.
 */
export async function notifyUser(
    supabase: SupabaseClient,
    userId: string,
    type: NotificationType,
    ctx: OrderContext = {},
    extraMetadata: Record<string, unknown> = {}
): Promise<{ success: boolean; error?: string }> {
    const { title, body } = getNotificationContent(type, ctx)

    return createNotification(supabase, {
        userId,
        type,
        title,
        body,
        metadata: {
            order_id: ctx.orderId,
            product_title: ctx.productTitle,
            ...extraMetadata,
        },
    })
}
