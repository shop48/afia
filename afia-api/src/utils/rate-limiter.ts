// ════════════════════════════════════════════
// MODULE 10: RATE LIMITER
// In-memory sliding-window rate limiter
// Compatible with Cloudflare Workers (no KV needed)
// ════════════════════════════════════════════

interface RateLimitEntry {
    timestamps: number[]
}

// Global in-memory store (per-isolate in CF Workers)
const store = new Map<string, RateLimitEntry>()

// Hard cap to prevent memory exhaustion from coordinated distributed attacks
const MAX_STORE_SIZE = 10_000

// Auto-cleanup interval tracking
let lastCleanup = Date.now()
const CLEANUP_INTERVAL_MS = 30_000 // Clean every 30s

/**
 * Configuration for different route categories
 */
export interface RateLimitConfig {
    /** Maximum number of requests allowed within the window */
    maxRequests: number
    /** Time window in milliseconds */
    windowMs: number
}

/** Pre-configured rate limit profiles */
export const RATE_LIMITS = {
    /** Auth endpoints: 10 requests per minute */
    AUTH: { maxRequests: 10, windowMs: 60_000 } as RateLimitConfig,
    /** General API: 60 requests per minute */
    API: { maxRequests: 60, windowMs: 60_000 } as RateLimitConfig,
    /** Webhooks: 200 requests per minute (external services may burst) */
    WEBHOOK: { maxRequests: 200, windowMs: 60_000 } as RateLimitConfig,
    /** Strict: 5 requests per minute (e.g. password reset, payout execution) */
    STRICT: { maxRequests: 5, windowMs: 60_000 } as RateLimitConfig,
} as const

/**
 * Check if a request should be rate-limited.
 *
 * @param key - Unique identifier (usually IP + path prefix)
 * @param config - Rate limit configuration
 * @returns { allowed, remaining, retryAfterMs }
 */
export function checkRateLimit(
    key: string,
    config: RateLimitConfig
): { allowed: boolean; remaining: number; retryAfterMs: number } {
    const now = Date.now()
    const windowStart = now - config.windowMs

    // Auto-cleanup stale entries periodically
    if (now - lastCleanup > CLEANUP_INTERVAL_MS || store.size > MAX_STORE_SIZE) {
        pruneExpiredEntries(now)
        lastCleanup = now
    }

    let entry = store.get(key)
    if (!entry) {
        entry = { timestamps: [] }
        store.set(key, entry)
    }

    // Remove timestamps outside the current window
    entry.timestamps = entry.timestamps.filter((t) => t > windowStart)

    if (entry.timestamps.length >= config.maxRequests) {
        // Rate limited — calculate retry-after from oldest timestamp in window
        const oldestInWindow = entry.timestamps[0]
        const retryAfterMs = oldestInWindow + config.windowMs - now

        return {
            allowed: false,
            remaining: 0,
            retryAfterMs: Math.max(0, retryAfterMs),
        }
    }

    // Allow the request
    entry.timestamps.push(now)

    return {
        allowed: true,
        remaining: config.maxRequests - entry.timestamps.length,
        retryAfterMs: 0,
    }
}

/**
 * Get the client IP from Cloudflare Workers request headers.
 * Falls back to a generic key if IP cannot be determined.
 */
export function getClientIp(request: Request): string {
    return (
        request.headers.get('CF-Connecting-IP') ||
        request.headers.get('X-Forwarded-For')?.split(',')[0].trim() ||
        request.headers.get('X-Real-IP') ||
        'unknown'
    )
}

/**
 * Determine which rate limit config to use based on the request path.
 */
export function getRateLimitForPath(path: string): RateLimitConfig {
    // Webhook endpoints — high limit (external services)
    if (path.startsWith('/api/webhooks/')) {
        return RATE_LIMITS.WEBHOOK
    }

    // Strict endpoints — very low limit (financial or destructive operations)
    if (
        path.includes('/payout/execute-batch') ||
        path.includes('/reset-password') ||
        path.includes('/checkout/initialize') ||
        path.includes('/kyc/submit') ||
        path.includes('/disputes/') && path.includes('/resolve')
    ) {
        return RATE_LIMITS.STRICT
    }

    // General API
    return RATE_LIMITS.API
}

/**
 * Remove entries that haven't been accessed within any active window.
 * Prevents memory leaks in long-running Workers.
 */
function pruneExpiredEntries(now: number): void {
    const maxWindowMs = 120_000 // 2 minutes — generous buffer

    // If over hard cap, aggressively prune oldest entries
    if (store.size > MAX_STORE_SIZE) {
        const entriesToRemove = store.size - Math.floor(MAX_STORE_SIZE * 0.7) // Prune to 70% capacity
        let removed = 0
        for (const key of store.keys()) {
            if (removed >= entriesToRemove) break
            store.delete(key)
            removed++
        }
        return
    }

    for (const [key, entry] of store.entries()) {
        // Remove entries with no recent timestamps
        const latest = entry.timestamps[entry.timestamps.length - 1]
        if (!latest || now - latest > maxWindowMs) {
            store.delete(key)
        }
    }
}
