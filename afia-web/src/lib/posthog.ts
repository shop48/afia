/**
 * PostHog Analytics — Event tracking for Neoa marketplace
 *
 * Initialization is lazy and environment-aware:
 * - Skipped entirely if VITE_POSTHOG_KEY is not set
 * - Never tracks in development unless explicitly configured
 *
 * Usage:
 *   import { trackEvent, identifyUser, resetUser } from '@/lib/posthog'
 *   trackEvent('purchase_completed', { amount: 5000, currency: 'NGN' })
 */

let posthogInstance: typeof import('posthog-js').default | null = null
let initialized = false

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY || ''
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com'

/**
 * Lazily initialize PostHog — only loads the SDK when first needed
 */
async function getPostHog() {
    if (!POSTHOG_KEY) return null

    if (!initialized) {
        try {
            const posthog = (await import('posthog-js')).default
            posthog.init(POSTHOG_KEY, {
                api_host: POSTHOG_HOST,
                autocapture: false,          // We track explicitly for cleaner data
                capture_pageview: true,      // Auto-track page views
                capture_pageleave: true,     // Track when users leave
                persistence: 'localStorage',
                loaded: (ph) => {
                    // Respect Do Not Track header
                    if (
                        navigator.doNotTrack === '1' ||
                        (window as any).doNotTrack === '1'
                    ) {
                        ph.opt_out_capturing()
                    }
                },
            })
            posthogInstance = posthog
            initialized = true
        } catch (err) {
            console.warn('[PostHog] Failed to initialize:', err)
            return null
        }
    }

    return posthogInstance
}

/**
 * Track a custom event
 */
export async function trackEvent(
    eventName: string,
    properties?: Record<string, unknown>
) {
    const ph = await getPostHog()
    ph?.capture(eventName, properties)
}

/**
 * Identify a user (call after login/signup)
 */
export async function identifyUser(
    userId: string,
    traits?: Record<string, unknown>
) {
    const ph = await getPostHog()
    ph?.identify(userId, traits)
}

/**
 * Reset user identity (call on logout)
 */
export async function resetUser() {
    const ph = await getPostHog()
    ph?.reset()
}

// ── Pre-defined event names for consistency ──
export const EVENTS = {
    // Auth
    SIGNUP_COMPLETED: 'signup_completed',
    LOGIN_COMPLETED: 'login_completed',
    LOGOUT: 'logout',

    // Catalog
    PRODUCT_VIEWED: 'product_viewed',
    CATALOG_SEARCHED: 'catalog_searched',

    // Checkout
    CHECKOUT_STARTED: 'checkout_started',
    PURCHASE_COMPLETED: 'purchase_completed',

    // Orders
    DELIVERY_CONFIRMED: 'delivery_confirmed',
    DISPUTE_FILED: 'dispute_filed',

    // Vendor
    PRODUCT_CREATED: 'product_created',
    ORDER_SHIPPED: 'order_shipped',
    KYC_STARTED: 'kyc_started',
    KYC_COMPLETED: 'kyc_completed',

    // Admin
    BATCH_PAYOUT_EXECUTED: 'batch_payout_executed',
    DISPUTE_RESOLVED: 'dispute_resolved',
} as const
