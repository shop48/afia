// ════════════════════════════════════════════
// MULTI-CURRENCY ENGINE
// Module 3 (Core) + Module 8 (Live Rates via Backend)
// Uses backend /api/fx-rates for live Wise rates
// Falls back to static rates for instant rendering
// ════════════════════════════════════════════

// Static FX rates (fallback — used for instant rendering before API responds)
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

const VOLATILITY_BUFFER = 0.03 // 3%

const CURRENCY_SYMBOLS: Record<string, string> = {
    USD: '$',
    NGN: '₦',
    GBP: '£',
    EUR: '€',
    GHS: '₵',
    KES: 'KSh',
    ZAR: 'R',
    GNF: 'GNF',
    XOF: 'CFA',
    CAD: 'C$',
}

const CURRENCY_NAMES: Record<string, string> = {
    USD: 'US Dollar',
    NGN: 'Nigerian Naira',
    GBP: 'British Pound',
    EUR: 'Euro',
    GHS: 'Ghanaian Cedi',
    KES: 'Kenyan Shilling',
    ZAR: 'South African Rand',
    GNF: 'Guinean Franc',
    XOF: 'West African CFA',
    CAD: 'Canadian Dollar',
}

// ── Live Rate Cache (client-side) ──
interface CachedRate {
    rate: number
    fetchedAt: number
    source: 'wise_live' | 'fallback_static'
}

const liveRateCache = new Map<string, CachedRate>()
const CACHE_TTL_MS = 3 * 60 * 1000 // 3 minutes (shorter than backend's 5min cache)

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787'

/**
 * Fetch a live FX rate from the backend (which proxies Wise API).
 * Returns cached result if still fresh.
 * Falls back to static rate on error.
 */
export async function fetchLiveRate(from: string, to: string): Promise<CachedRate> {
    const cacheKey = `${from}-${to}`
    const cached = liveRateCache.get(cacheKey)

    // Return cached if fresh
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
        return cached
    }

    try {
        const response = await fetch(`${API_URL}/api/fx-rates?from=${from}&to=${to}`)

        if (!response.ok) throw new Error(`Status ${response.status}`)

        const data = await response.json() as {
            rate: number | null
            source: 'wise_live' | 'fallback_static'
        }

        if (data.rate) {
            const result: CachedRate = {
                rate: data.rate,
                fetchedAt: Date.now(),
                source: data.source,
            }
            liveRateCache.set(cacheKey, result)
            return result
        }
    } catch (err) {
        console.warn(`Failed to fetch live rate ${from}→${to}:`, err)
    }

    // Fallback to static
    const staticRate = getStaticRate(from, to)
    return {
        rate: staticRate || 1,
        fetchedAt: Date.now(),
        source: 'fallback_static',
    }
}

/**
 * Get the static (fallback) FX rate between two currencies.
 * No buffer applied — raw conversion rate.
 */
function getStaticRate(from: string, to: string): number | null {
    const fromRate = FALLBACK_FX_RATES[from]
    const toRate = FALLBACK_FX_RATES[to]
    if (!fromRate || !toRate) return null
    return toRate / fromRate
}

/**
 * Convert a price from one currency to another (synchronous, uses static rates).
 * Applies the 3% volatility buffer on top of the base rate.
 */
export function convertPrice(amount: number, from: string, to: string): number {
    if (from === to) return amount

    const rate = getStaticRate(from, to)
    if (!rate) return amount

    // Apply 3% volatility buffer (buyer pays slightly more)
    return amount * rate * (1 + VOLATILITY_BUFFER)
}

/**
 * Format a price with locale-aware formatting and currency symbol.
 */
export function formatCurrency(amount: number, currency: string): string {
    const symbol = CURRENCY_SYMBOLS[currency] || currency
    const decimals = ['NGN', 'GNF', 'XOF', 'KES'].includes(currency) ? 0 : 2

    const formatted = amount.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    })

    return `${symbol}${formatted}`
}

/**
 * Get a display string showing the converted price.
 * E.g., "≈ $32.50 USD"
 */
export function getConvertedDisplay(amount: number, from: string, to: string): string {
    if (from === to) return ''
    const converted = convertPrice(amount, from, to)
    return `≈ ${formatCurrency(converted, to)} ${to}`
}

/**
 * Get all supported currencies for display.
 */
export function getSupportedCurrencies(): Array<{ code: string; name: string; symbol: string }> {
    return Object.keys(FALLBACK_FX_RATES).map(code => ({
        code,
        name: CURRENCY_NAMES[code] || code,
        symbol: CURRENCY_SYMBOLS[code] || code,
    }))
}

/**
 * Get the FX rate between two currencies (with buffer).
 * Synchronous — uses static fallback rates for immediate rendering.
 * For live rates, use fetchLiveRate() instead.
 */
export function getRate(from: string, to: string): number | null {
    const rate = getStaticRate(from, to)
    if (!rate) return null
    return rate * (1 + VOLATILITY_BUFFER)
}

/**
 * Get currency symbol for a given currency code.
 */
export function getCurrencySymbol(currency: string): string {
    return CURRENCY_SYMBOLS[currency] || currency
}

/**
 * Get currency name for a given currency code.
 */
export function getCurrencyName(currency: string): string {
    return CURRENCY_NAMES[currency] || currency
}
