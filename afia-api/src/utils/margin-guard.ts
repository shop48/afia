// ════════════════════════════════════════════
// MARGIN GUARD — Live FX Integration
// Module 4 (Core Logic) + Module 8 (Live Wise Rates)
// Technical Blueprint §4, Security Manifest §4
// ════════════════════════════════════════════

import { getWiseLiveRate, pruneRateCache } from './wise'

const MARGIN_THRESHOLD = 0.03 // 3% drift tolerance

/**
 * Check if the FX rate has drifted beyond the safety threshold.
 *
 * @param checkoutRate - The FX rate snapshot when buyer initiated checkout
 * @param currentRate - The current live FX rate
 * @param threshold - Maximum allowed drift (default 3%)
 * @returns { passed: boolean, drift: number } — drift as a decimal (0.05 = 5%)
 */
export function checkMarginDrift(
    checkoutRate: number,
    currentRate: number,
    threshold: number = MARGIN_THRESHOLD
): { passed: boolean; drift: number } {
    if (checkoutRate <= 0 || currentRate <= 0) {
        return { passed: false, drift: 1 }
    }

    const drift = Math.abs(currentRate - checkoutRate) / checkoutRate

    return {
        passed: drift <= threshold,
        drift: Math.round(drift * 10000) / 10000, // 4 decimal places
    }
}

// ── Fallback Static FX Rates (used when Wise API is unavailable) ──

const FALLBACK_FX_RATES: Record<string, number> = {
    USD: 1,
    NGN: 1580,
    GBP: 0.79,
    EUR: 0.92,
    GHS: 14.5,
    KES: 153,
    ZAR: 18.2,
    GNF: 8600,
    XOF: 605,
    CAD: 1.36,
}

/**
 * Get the current FX rate between two currencies.
 *
 * Behavior:
 * 1. If Wise API token is provided → fetch live rate from Wise API (5-min cache)
 * 2. If Wise API unavailable → fall back to static rates
 *
 * The static rates act as a safety net during Wise API outages.
 */
export async function getLiveFxRate(
    from: string,
    to: string,
    wiseToken?: string
): Promise<number | null> {
    // Try live Wise rate first
    if (wiseToken) {
        const liveRate = await getWiseLiveRate(from, to, wiseToken)
        if (liveRate !== null) {
            return liveRate
        }
        console.warn(`⚠️ Wise API unavailable for ${from}→${to}, using fallback rates`)
    }

    // Fallback to static rates
    return getFallbackFxRate(from, to)
}

/**
 * Synchronous fallback FX rate (used in hot paths where await is expensive).
 * This is the SAME function from the old code — used as a fallback.
 */
export function getCurrentFxRate(from: string, to: string): number | null {
    return getFallbackFxRate(from, to)
}

function getFallbackFxRate(from: string, to: string): number | null {
    const fromRate = FALLBACK_FX_RATES[from]
    const toRate = FALLBACK_FX_RATES[to]
    if (!fromRate || !toRate) return null
    return toRate / fromRate
}

/**
 * Calculate the platform fee (15%) and vendor payout (85%).
 */
export function calculateFees(grossAmount: number): {
    feeAmount: number
    netPayout: number
} {
    const feeAmount = Math.round(grossAmount * 0.15 * 100) / 100
    const netPayout = Math.round((grossAmount - feeAmount) * 100) / 100
    return { feeAmount, netPayout }
}

/**
 * Get all supported currencies and their fallback rates.
 * Used by the admin dashboard for batch recalculation.
 */
export function getSupportedCurrencies(): Array<{ code: string; rate: number }> {
    return Object.entries(FALLBACK_FX_RATES).map(([code, rate]) => ({ code, rate }))
}

/**
 * Prune stale entries from the FX rate cache.
 * Call periodically in long-running Workers to prevent memory leaks.
 */
export function cleanupRateCache(): void {
    pruneRateCache()
}
