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
export const PLATFORM_FEE_RATE = 0.15   // 15% platform commission
export const MIN_PROFIT_FLOOR = 0.10    // 10% minimum net profit

export function calculateFees(grossAmount: number): {
    feeAmount: number
    netPayout: number
} {
    const feeAmount = Math.round(grossAmount * PLATFORM_FEE_RATE * 100) / 100
    const netPayout = Math.round((grossAmount - feeAmount) * 100) / 100
    return { feeAmount, netPayout }
}

/**
 * 10% Net Profit Floor Check.
 * 
 * Business logic: We collect 15% commission to cover ALL operational costs
 * (Paystack fees, FX costs, etc.). After deducting these costs, our net profit
 * must remain >= 10% of the gross transaction amount.
 *
 * Costs deducted:
 * - Paystack transfer fee: ₦50 flat per NGN transfer (5000 kobo)
 * - FX conversion spread: estimated percentage when USD→NGN via Wise
 * 
 * @param grossAmount - Total transaction amount in base currency
 * @param currency - Transaction currency (NGN, USD, etc.)
 * @param payoutRail - 'PAYSTACK_NGN' or 'WISE_GLOBAL'
 * @param fxRateAtCheckout - FX rate when buyer paid (for cross-currency orders)
 * @param currentFxRate - Current live FX rate (for drift calculation)
 */
export function checkProfitFloor(params: {
    grossAmount: number
    currency: string
    payoutRail: string
    fxRateAtCheckout?: number | null
    currentFxRate?: number | null
}): {
    passed: boolean
    netProfitPercent: number
    platformFee: number
    operationalCosts: number
    netProfit: number
    details: string
} {
    const { grossAmount, currency, payoutRail, fxRateAtCheckout, currentFxRate } = params

    // Platform commission (15% of gross)
    const platformFee = Math.round(grossAmount * PLATFORM_FEE_RATE * 100) / 100

    // Calculate operational costs
    let operationalCosts = 0
    const costBreakdown: string[] = []

    // 1. Paystack transfer fee: ₦50 per NGN transfer
    if (payoutRail === 'PAYSTACK_NGN') {
        // If transaction is in NGN, deduct ₦50 directly
        if (currency === 'NGN') {
            operationalCosts += 50  // ₦50
            costBreakdown.push('Paystack transfer: ₦50')
        } else {
            // If transaction is in USD, convert ₦50 to USD equivalent
            const rate = currentFxRate || fxRateAtCheckout || 1580
            const feeInUsd = 50 / rate
            operationalCosts += feeInUsd
            costBreakdown.push(`Paystack transfer: ~$${feeInUsd.toFixed(4)} (₦50 at ${rate})`)
        }
    }

    // 2. Wise FX conversion spread (~0.5-1% for USD→NGN)
    if (payoutRail === 'WISE_GLOBAL' && fxRateAtCheckout && currentFxRate) {
        const fxSpread = Math.abs(currentFxRate - fxRateAtCheckout) / fxRateAtCheckout
        const fxCost = grossAmount * fxSpread
        operationalCosts += fxCost
        costBreakdown.push(`FX spread: ${(fxSpread * 100).toFixed(2)}% = ${currency} ${fxCost.toFixed(2)}`)
    }

    // Net profit after costs
    const netProfit = platformFee - operationalCosts
    const netProfitPercent = grossAmount > 0 ? netProfit / grossAmount : 0

    const passed = netProfitPercent >= MIN_PROFIT_FLOOR

    return {
        passed,
        netProfitPercent: Math.round(netProfitPercent * 10000) / 10000, // 4 decimal places
        platformFee,
        operationalCosts: Math.round(operationalCosts * 100) / 100,
        netProfit: Math.round(netProfit * 100) / 100,
        details: passed
            ? `Profit floor OK: ${(netProfitPercent * 100).toFixed(2)}% net (min ${MIN_PROFIT_FLOOR * 100}%)`
            : `⚠️ BELOW PROFIT FLOOR: ${(netProfitPercent * 100).toFixed(2)}% net < ${MIN_PROFIT_FLOOR * 100}% min. Costs: ${costBreakdown.join(', ')}`,
    }
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

