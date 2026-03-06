/**
 * Sentry Error Monitoring — Neoa marketplace
 *
 * Initialization is lazy and environment-aware:
 * - Skipped entirely if VITE_SENTRY_DSN is not set
 * - Reduced sampling in development
 *
 * Usage:
 *   import { captureError, captureMessage } from '@/lib/sentry'
 *   captureError(new Error('something broke'))
 */

let sentryInstance: typeof import('@sentry/react') | null = null
let initialized = false

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN || ''
const IS_PRODUCTION = import.meta.env.PROD

/**
 * Lazily initialize Sentry — only loads SDK when first needed
 */
async function getSentry() {
    if (!SENTRY_DSN) return null

    if (!initialized) {
        try {
            const Sentry = await import('@sentry/react')
            Sentry.init({
                dsn: SENTRY_DSN,
                environment: IS_PRODUCTION ? 'production' : 'development',
                // Capture 100% of errors in prod, 10% in dev
                sampleRate: IS_PRODUCTION ? 1.0 : 0.1,
                // Performance monitoring — 20% of transactions in prod
                tracesSampleRate: IS_PRODUCTION ? 0.2 : 0.0,
                // Don't send PII
                sendDefaultPii: false,
                // Ignore common browser noise
                ignoreErrors: [
                    'ResizeObserver loop limit exceeded',
                    'ResizeObserver loop completed with undelivered notifications',
                    'Non-Error promise rejection captured',
                    'AbortError',
                    'ChunkLoadError',
                ],
                beforeSend(event) {
                    // Strip user IP addresses
                    if (event.user) {
                        delete event.user.ip_address
                    }
                    return event
                },
            })
            sentryInstance = Sentry
            initialized = true
        } catch (err) {
            console.warn('[Sentry] Failed to initialize:', err)
            return null
        }
    }

    return sentryInstance
}

/**
 * Capture an error
 */
export async function captureError(
    error: Error | unknown,
    context?: Record<string, unknown>
) {
    const Sentry = await getSentry()
    if (!Sentry) {
        console.error('[Sentry not initialized]', error)
        return
    }

    if (context) {
        Sentry.withScope((scope) => {
            Object.entries(context).forEach(([key, value]) => {
                scope.setExtra(key, value)
            })
            Sentry.captureException(error)
        })
    } else {
        Sentry.captureException(error)
    }
}

/**
 * Capture a message (for non-error events worth tracking)
 */
export async function captureMessage(
    message: string,
    level: 'info' | 'warning' | 'error' = 'info'
) {
    const Sentry = await getSentry()
    Sentry?.captureMessage(message, level)
}

/**
 * Set user context (call after login)
 */
export async function setUser(user: { id: string; email?: string; role?: string }) {
    const Sentry = await getSentry()
    Sentry?.setUser({ id: user.id, email: user.email, role: user.role } as any)
}

/**
 * Clear user context (call on logout)
 */
export async function clearUser() {
    const Sentry = await getSentry()
    Sentry?.setUser(null)
}

/**
 * Initialize Sentry eagerly (call from main.tsx)
 */
export async function initSentry() {
    await getSentry()
}
