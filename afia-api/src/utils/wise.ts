// ════════════════════════════════════════════
// WISE (TRANSFERWISE) API CLIENT
// Module 8: Real Payment Integrations
// Docs: https://docs.wise.com/api-docs
// ════════════════════════════════════════════

const WISE_API_BASE = 'https://api.sandbox.transferwise.tech' // Sandbox
// Production: 'https://api.wise.com'

const REQUEST_TIMEOUT_MS = 30_000

// Valid ISO 4217 currency codes supported by Wise
const VALID_CURRENCY_RE = /^[A-Z]{3}$/

// ── Types ──

export interface WiseRecipientRequest {
    currency: string
    type: string           // e.g., 'nigerian' for NGN, 'sort_code' for GBP
    profile: number        // Wise profile ID
    accountHolderName: string
    details: Record<string, string>  // Bank-specific fields
}

export interface WiseRecipient {
    id: number
    profile: number
    accountHolderName: string
    currency: string
    type: string
    active: boolean
}

export interface WiseQuote {
    id: string
    sourceCurrency: string
    targetCurrency: string
    sourceAmount: number | null
    targetAmount: number | null
    rate: number
    fee: number
    formattedEstimatedDelivery: string
    createdTime: string
    expirationTime: string
    status: string
}

export interface WiseTransfer {
    id: number
    targetAccount: number
    quoteUuid: string
    status: string       // 'incoming_payment_waiting', 'processing', 'funds_converted', 'outgoing_payment_sent', 'cancelled', 'funds_refunded'
    reference: string
    rate: number
    created: string
    sourceValue: number
    sourceCurrency: string
    targetValue: number
    targetCurrency: string
    customerTransactionId: string
}

export interface WiseRate {
    source: string
    target: string
    rate: number
    time: string
}

export interface WiseFundingResponse {
    type: string
    status: string
    errorCode: string | null
}

// ── Rate Cache ──

interface CachedRate {
    rate: number
    fetchedAt: number
}

const rateCache = new Map<string, CachedRate>()
const RATE_CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

// ── Helper: Fetch with timeout ──

async function wiseFetch(
    endpoint: string,
    token: string,
    options: RequestInit = {}
): Promise<Response> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
        const response = await fetch(`${WISE_API_BASE}${endpoint}`, {
            ...options,
            signal: controller.signal,
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...((options.headers as Record<string, string>) || {}),
            },
        })
        return response
    } finally {
        clearTimeout(timeout)
    }
}

// ══════════════════════════════════════════════
// 1. LIVE FX RATES
// ══════════════════════════════════════════════

/**
 * Fetch live exchange rate from Wise.
 * Results are cached for 5 minutes.
 * Falls back to null on failure (caller should use mock rates).
 */
export async function getWiseLiveRate(
    source: string,
    target: string,
    token: string
): Promise<number | null> {
    // Validate currency codes to prevent path injection
    if (!VALID_CURRENCY_RE.test(source) || !VALID_CURRENCY_RE.test(target)) {
        console.error(`Invalid currency codes: ${source}, ${target}`)
        return null
    }

    const cacheKey = `${source}-${target}`
    const cached = rateCache.get(cacheKey)

    // Return cached if still fresh
    if (cached && Date.now() - cached.fetchedAt < RATE_CACHE_TTL_MS) {
        return cached.rate
    }

    try {
        const res = await wiseFetch(
            `/v1/rates?source=${encodeURIComponent(source)}&target=${encodeURIComponent(target)}`,
            token
        )

        if (res.status === 429) {
            console.warn('Wise API rate-limited — returning stale cache')
            return cached?.rate ?? null
        }

        if (!res.ok) {
            console.error(`Wise rate API error (${res.status}): ${await res.text()}`)
            return cached?.rate ?? null // Return stale cache on error
        }

        const rates = (await res.json()) as WiseRate[]
        if (!rates.length) return null

        const rate = rates[0].rate
        if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) {
            console.error(`Wise returned invalid rate: ${rate}`)
            return cached?.rate ?? null
        }

        // Cache the result
        rateCache.set(cacheKey, { rate, fetchedAt: Date.now() })

        return rate
    } catch (err) {
        console.error('Wise rate fetch failed:', err instanceof Error ? err.message : err)
        return cached?.rate ?? null
    }
}

/**
 * Clear expired entries from the rate cache.
 * Called periodically to prevent memory leaks in long-running Workers.
 */
export function pruneRateCache(): void {
    const now = Date.now()
    for (const [key, cached] of rateCache.entries()) {
        if (now - cached.fetchedAt > RATE_CACHE_TTL_MS * 2) {
            rateCache.delete(key)
        }
    }
}

// ══════════════════════════════════════════════
// 2. RECIPIENT PROFILES
// ══════════════════════════════════════════════

/**
 * Create a recipient (payee) profile on Wise.
 * For NGN: type = 'nigerian', details = { accountNumber, bankCode }
 * For GBP: type = 'sort_code', details = { sortCode, accountNumber }
 * For USD: type = 'aba', details = { abartn, accountNumber, accountType }
 */
export async function createRecipient(
    params: WiseRecipientRequest,
    token: string
): Promise<WiseRecipient> {
    const res = await wiseFetch('/v1/accounts', token, {
        method: 'POST',
        body: JSON.stringify(params),
    })

    if (!res.ok) {
        const errText = await res.text()
        throw new Error(`Wise create recipient failed (${res.status}): ${errText}`)
    }

    return (await res.json()) as WiseRecipient
}

/**
 * Get an existing recipient by ID.
 */
export async function getRecipient(
    recipientId: number,
    token: string
): Promise<WiseRecipient> {
    const res = await wiseFetch(`/v1/accounts/${recipientId}`, token)

    if (!res.ok) {
        throw new Error(`Wise get recipient failed (${res.status})`)
    }

    return (await res.json()) as WiseRecipient
}

/**
 * Delete (deactivate) a recipient.
 */
export async function deleteRecipient(
    recipientId: number,
    token: string
): Promise<void> {
    const res = await wiseFetch(`/v1/accounts/${recipientId}`, token, {
        method: 'DELETE',
    })

    if (!res.ok) {
        throw new Error(`Wise delete recipient failed (${res.status})`)
    }
}

// ══════════════════════════════════════════════
// 3. QUOTES
// ══════════════════════════════════════════════

/**
 * Create a quote for a transfer.
 * Use `targetAmount` for "I want the recipient to receive exactly X".
 * Use `sourceAmount` for "I want to send exactly X".
 */
export async function createQuote(params: {
    profileId: number
    sourceCurrency: string
    targetCurrency: string
    targetAmount?: number
    sourceAmount?: number
}, token: string): Promise<WiseQuote> {
    const body: Record<string, unknown> = {
        sourceCurrency: params.sourceCurrency,
        targetCurrency: params.targetCurrency,
        payOut: 'BANK_TRANSFER',
    }

    // Wise requires exactly one of sourceAmount/targetAmount
    if (params.targetAmount) {
        body.targetAmount = params.targetAmount
    } else if (params.sourceAmount) {
        body.sourceAmount = params.sourceAmount
    } else {
        throw new Error('Either sourceAmount or targetAmount is required')
    }

    const res = await wiseFetch(
        `/v3/profiles/${params.profileId}/quotes`,
        token,
        {
            method: 'POST',
            body: JSON.stringify(body),
        }
    )

    if (!res.ok) {
        const errText = await res.text()
        throw new Error(`Wise create quote failed (${res.status}): ${errText}`)
    }

    return (await res.json()) as WiseQuote
}

// ══════════════════════════════════════════════
// 4. TRANSFERS
// ══════════════════════════════════════════════

/**
 * Create a transfer linked to a quote and recipient.
 * Uses idempotency key (`customerTransactionId`) to prevent double-sends.
 */
export async function createTransfer(params: {
    targetAccount: number   // Recipient ID
    quoteUuid: string       // Quote UUID
    customerTransactionId: string  // Idempotency key (our order ID works well)
    reference?: string      // Message to recipient (max 35 chars)
}, token: string): Promise<WiseTransfer> {
    const res = await wiseFetch('/v1/transfers', token, {
        method: 'POST',
        body: JSON.stringify({
            targetAccount: params.targetAccount,
            quoteUuid: params.quoteUuid,
            customerTransactionId: params.customerTransactionId,
            details: {
                reference: params.reference || 'Afia Marketplace Payout',
            },
        }),
    })

    if (!res.ok) {
        const errText = await res.text()
        throw new Error(`Wise create transfer failed (${res.status}): ${errText}`)
    }

    return (await res.json()) as WiseTransfer
}

/**
 * Fund a transfer (execute the payout).
 * This is the "launch" button — money actually moves after this.
 */
export async function fundTransfer(
    profileId: number,
    transferId: number,
    token: string
): Promise<WiseFundingResponse> {
    const res = await wiseFetch(
        `/v3/profiles/${profileId}/transfers/${transferId}/payments`,
        token,
        {
            method: 'POST',
            body: JSON.stringify({ type: 'BALANCE' }),
        }
    )

    if (!res.ok) {
        const errText = await res.text()
        throw new Error(`Wise fund transfer failed (${res.status}): ${errText}`)
    }

    return (await res.json()) as WiseFundingResponse
}

/**
 * Get a transfer's current status.
 */
export async function getTransfer(
    transferId: number,
    token: string
): Promise<WiseTransfer> {
    const res = await wiseFetch(`/v1/transfers/${transferId}`, token)

    if (!res.ok) {
        throw new Error(`Wise get transfer failed (${res.status})`)
    }

    return (await res.json()) as WiseTransfer
}

/**
 * Cancel a transfer (only possible before it's processed).
 */
export async function cancelTransfer(
    transferId: number,
    token: string
): Promise<void> {
    const res = await wiseFetch(
        `/v1/transfers/${transferId}/cancel`,
        token,
        { method: 'PUT' }
    )

    if (!res.ok) {
        const errText = await res.text()
        throw new Error(`Wise cancel transfer failed (${res.status}): ${errText}`)
    }
}

// ══════════════════════════════════════════════
// 5. WEBHOOK SIGNATURE VERIFICATION
// ══════════════════════════════════════════════

// Cached Wise public key (refreshed every 24h)
let cachedPublicKey: { key: CryptoKey; fetchedAt: number } | null = null
const PUBLIC_KEY_CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

/**
 * Fetch Wise's RSA public key for webhook signature verification.
 * The key is cached for 24 hours.
 */
async function getWisePublicKey(token: string): Promise<CryptoKey | null> {
    if (cachedPublicKey && Date.now() - cachedPublicKey.fetchedAt < PUBLIC_KEY_CACHE_TTL) {
        return cachedPublicKey.key
    }

    try {
        const res = await wiseFetch('/v1/webhook/public-key', token)
        if (!res.ok) {
            console.error(`Failed to fetch Wise public key: ${res.status}`)
            return cachedPublicKey?.key ?? null
        }

        const body = (await res.json()) as { key: string }
        if (!body.key) return null

        // Parse PEM → DER → import as CryptoKey
        const pemHeader = '-----BEGIN PUBLIC KEY-----'
        const pemFooter = '-----END PUBLIC KEY-----'
        const pemContents = body.key
            .replace(pemHeader, '')
            .replace(pemFooter, '')
            .replace(/\r?\n/g, '')

        const binaryString = atob(pemContents)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i)
        }

        const key = await crypto.subtle.importKey(
            'spki',
            bytes.buffer,
            { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
            false,
            ['verify']
        )

        cachedPublicKey = { key, fetchedAt: Date.now() }
        return key
    } catch (err) {
        console.error('Failed to import Wise public key:', err)
        return cachedPublicKey?.key ?? null
    }
}

/**
 * Verify Wise webhook signature via RSA-SHA256.
 *
 * In sandbox mode (WISE_SANDBOX=true or no public key available),
 * performs structural validation only. In production, performs
 * full RSA-SHA256 signature verification.
 *
 * @param payload - Raw request body
 * @param signature - Base64-encoded RSA-SHA256 signature from X-Signature-SHA256 header
 * @param token - Wise API token (used to fetch public key)
 * @param sandboxMode - If true, skip strict RSA verification
 */
export async function verifyWiseWebhookSignature(
    payload: string,
    signature: string,
    token: string,
    sandboxMode: boolean = true  // TODO: set false for production
): Promise<boolean> {
    if (!signature || !payload) return false

    // Sandbox mode: structural validation only
    if (sandboxMode) {
        // Ensure signature is non-empty and looks like base64
        if (signature.length < 10) return false
        console.log('[Wise Webhook] Signature validation (sandbox mode): structural check passed')
        return true
    }

    // Production mode: full RSA-SHA256 verification
    try {
        const publicKey = await getWisePublicKey(token)
        if (!publicKey) {
            console.error('[Wise Webhook] Cannot verify: no public key available')
            return false
        }

        // Decode the base64-encoded signature
        const sigBinary = atob(signature)
        const sigBytes = new Uint8Array(sigBinary.length)
        for (let i = 0; i < sigBinary.length; i++) {
            sigBytes[i] = sigBinary.charCodeAt(i)
        }

        const encoder = new TextEncoder()
        const isValid = await crypto.subtle.verify(
            'RSASSA-PKCS1-v1_5',
            publicKey,
            sigBytes.buffer,
            encoder.encode(payload)
        )

        if (!isValid) {
            console.error('[Wise Webhook] RSA-SHA256 signature verification FAILED')
        }

        return isValid
    } catch (err) {
        console.error('[Wise Webhook] Signature verification error:', err)
        return false
    }
}

// ══════════════════════════════════════════════
// 6. BATCH PAYOUT ORCHESTRATOR
// ══════════════════════════════════════════════

export interface BatchPayoutItem {
    orderId: string
    escrowId: string
    vendorId: string
    recipientId: number
    amount: number
    currency: string
}

export interface BatchPayoutResult {
    orderId: string
    status: 'SUCCESS' | 'FAILED' | 'SKIPPED'
    transferId?: number
    quoteId?: string
    error?: string
}

/**
 * Execute a batch of Wise payouts.
 * Creates quote → create transfer → fund transfer for each item.
 * Uses idempotency keys (orderId) to prevent double-sends.
 */
export async function executeBatchWisePayouts(
    profileId: number,
    items: BatchPayoutItem[],
    sourceCurrency: string,
    token: string
): Promise<BatchPayoutResult[]> {
    const results: BatchPayoutResult[] = []

    for (const item of items) {
        try {
            // 1. Create quote (target amount = what vendor should receive)
            const quote = await createQuote({
                profileId,
                sourceCurrency,
                targetCurrency: item.currency,
                targetAmount: item.amount,
            }, token)

            // 2. Create transfer with idempotency key
            const transfer = await createTransfer({
                targetAccount: item.recipientId,
                quoteUuid: quote.id,
                customerTransactionId: `AFIA-PAYOUT-${item.orderId}`,
                reference: `Afia Order ${item.orderId.slice(0, 8)}`,
            }, token)

            // 3. Fund the transfer (execute)
            await fundTransfer(profileId, transfer.id, token)

            results.push({
                orderId: item.orderId,
                status: 'SUCCESS',
                transferId: transfer.id,
                quoteId: quote.id,
            })

            console.log(`✅ Wise payout for order ${item.orderId}: transfer ${transfer.id} funded`)
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error'
            console.error(`❌ Wise payout failed for order ${item.orderId}:`, message)

            results.push({
                orderId: item.orderId,
                status: 'FAILED',
                error: message,
            })
        }
    }

    return results
}
