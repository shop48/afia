// ════════════════════════════════════════════
// PAYSTACK API UTILITIES
// Module 4 + Module 8: Collection, Refund, Verify, Transfer
// Docs: https://paystack.com/docs/api
// ════════════════════════════════════════════

const PAYSTACK_API_BASE = 'https://api.paystack.co'
const REQUEST_TIMEOUT_MS = 15_000

// ── Helper: Fetch with timeout ──

async function paystackFetch(
    endpoint: string,
    secretKey: string,
    options: RequestInit = {}
): Promise<Response> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
        return await fetch(`${PAYSTACK_API_BASE}${endpoint}`, {
            ...options,
            signal: controller.signal,
            headers: {
                Authorization: `Bearer ${secretKey}`,
                'Content-Type': 'application/json',
                ...((options.headers as Record<string, string>) || {}),
            },
        })
    } finally {
        clearTimeout(timeout)
    }
}

// ══════════════════════════════════════════════
// 1. WEBHOOK SIGNATURE VERIFICATION
// ══════════════════════════════════════════════

/**
 * Verify Paystack webhook signature using HMAC-SHA512.
 * Uses constant-time comparison to prevent timing attacks.
 * Paystack sends a hash in the `x-paystack-signature` header.
 */
export async function verifyWebhookSignature(
    body: string,
    signature: string,
    secret: string
): Promise<boolean> {
    if (!signature || !secret) return false

    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-512' },
        false,
        ['sign']
    )

    const signatureBuffer = await crypto.subtle.sign(
        'HMAC',
        key,
        encoder.encode(body)
    )

    const expectedHash = Array.from(new Uint8Array(signatureBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')

    // Constant-time string comparison to prevent timing attacks
    return timingSafeEqual(expectedHash, signature)
}

/**
 * Constant-time string comparison.
 * Prevents timing side-channel attacks on webhook signature verification.
 */
function timingSafeEqual(a: string, b: string): boolean {
    // Pad to same length to avoid length-based timing leak
    const maxLen = Math.max(a.length, b.length)
    const paddedA = a.padEnd(maxLen, '\0')
    const paddedB = b.padEnd(maxLen, '\0')

    let result = a.length ^ b.length // mismatch on length still detected
    for (let i = 0; i < maxLen; i++) {
        result |= paddedA.charCodeAt(i) ^ paddedB.charCodeAt(i)
    }
    return result === 0
}

// ══════════════════════════════════════════════
// 2. INITIALIZE TRANSACTION (Collection)
// ══════════════════════════════════════════════

/**
 * Initialize a Paystack transaction (server-side).
 * Returns the authorization_url for the inline popup and the reference.
 */
export async function initializeTransaction(params: {
    email: string
    amount: number // in subunit (kobo for NGN, cents for USD)
    reference: string
    callbackUrl: string
    secretKey: string
    currency?: string // ISO 4217: 'NGN', 'USD', 'GHS', 'ZAR', 'KES'
    metadata?: Record<string, unknown>
}): Promise<{ authorization_url: string; reference: string; access_code: string }> {
    const body: Record<string, unknown> = {
        email: params.email,
        amount: params.amount,
        reference: params.reference,
        callback_url: params.callbackUrl,
        metadata: params.metadata || {},
    }
    // Pass currency to Paystack — enables multi-currency collection
    // When currency is 'USD', Paystack charges in USD and settles to merchant's USD dom account
    if (params.currency) {
        body.currency = params.currency
    }
    const response = await paystackFetch('/transaction/initialize', params.secretKey, {
        method: 'POST',
        body: JSON.stringify(body),
    })

    if (!response.ok) {
        const text = await response.text()
        throw new Error(`Paystack API error (${response.status}): ${text}`)
    }

    const result = await response.json() as {
        status: boolean
        message: string
        data: { authorization_url: string; reference: string; access_code: string }
    }

    if (!result.status) {
        throw new Error(`Paystack init failed: ${result.message}`)
    }

    return result.data
}

// ══════════════════════════════════════════════
// 3. VERIFY TRANSACTION
// ══════════════════════════════════════════════

export interface PaystackVerifyResult {
    status: string              // 'success', 'failed', 'abandoned'
    reference: string
    amount: number              // in kobo
    currency: string
    gateway_response: string
    channel: string             // 'card', 'bank', 'ussd', etc.
    paid_at: string
    customer: {
        email: string
        id: number
    }
    metadata: Record<string, unknown>
    authorization: {
        authorization_code: string
        bin: string
        last4: string
        exp_month: string
        exp_year: string
        channel: string
        card_type: string
        bank: string
        brand: string
    }
}

/**
 * Verify a Paystack transaction by reference.
 * Server-side verification to confirm payment wasn't spoofed.
 */
export async function verifyTransaction(
    reference: string,
    secretKey: string
): Promise<PaystackVerifyResult> {
    const response = await paystackFetch(
        `/transaction/verify/${encodeURIComponent(reference)}`,
        secretKey
    )

    if (!response.ok) {
        const text = await response.text()
        throw new Error(`Paystack verify failed (${response.status}): ${text}`)
    }

    const result = await response.json() as {
        status: boolean
        message: string
        data: PaystackVerifyResult
    }

    if (!result.status) {
        throw new Error(`Paystack verify failed: ${result.message}`)
    }

    return result.data
}

// ══════════════════════════════════════════════
// 4. REFUND TRANSACTION
// ══════════════════════════════════════════════

export interface PaystackRefundResult {
    id: number
    integration: number
    transaction: number
    status: string            // 'pending', 'processed', 'failed'
    amount: number            // in kobo
    currency: string
    channel: string
    merchant_note: string
    refunded_at: string | null
    expected_at: string
    customer_note: string
}

/**
 * Initiate a refund on Paystack.
 * Can refund full or partial amount.
 * Uses the original transaction reference.
 */
export async function createRefund(params: {
    transaction: string       // Paystack transaction reference
    amount?: number           // in kobo (optional: omit for full refund)
    merchantNote?: string     // Internal note
    customerNote?: string     // Message to customer
    secretKey: string
}): Promise<PaystackRefundResult> {
    const body: Record<string, unknown> = {
        transaction: params.transaction,
    }

    if (params.amount) body.amount = params.amount
    if (params.merchantNote) body.merchant_note = params.merchantNote
    if (params.customerNote) body.customer_note = params.customerNote

    const response = await paystackFetch('/refund', params.secretKey, {
        method: 'POST',
        body: JSON.stringify(body),
    })

    if (!response.ok) {
        const text = await response.text()
        throw new Error(`Paystack refund failed (${response.status}): ${text}`)
    }

    const result = await response.json() as {
        status: boolean
        message: string
        data: PaystackRefundResult
    }

    if (!result.status) {
        throw new Error(`Paystack refund failed: ${result.message}`)
    }

    return result.data
}

// ══════════════════════════════════════════════
// 5. LOCAL NGN PAYOUTS (Paystack Transfer)
// ══════════════════════════════════════════════

export interface PaystackTransferRecipient {
    recipient_code: string
    type: string
    name: string
    description: string
    metadata: Record<string, unknown>
    bank_code: string
    currency: string
    active: boolean
}

/**
 * Create a transfer recipient (vendor's bank account) on Paystack.
 * Required before sending money via Paystack Transfer.
 */
export async function createTransferRecipient(params: {
    type: string             // 'nuban' for NGN
    name: string             // Account holder name
    accountNumber: string
    bankCode: string
    currency?: string        // default 'NGN'
    description?: string
    secretKey: string
}): Promise<PaystackTransferRecipient> {
    const response = await paystackFetch('/transferrecipient', params.secretKey, {
        method: 'POST',
        body: JSON.stringify({
            type: params.type,
            name: params.name,
            account_number: params.accountNumber,
            bank_code: params.bankCode,
            currency: params.currency || 'NGN',
            description: params.description || 'Afia Marketplace Vendor',
        }),
    })

    if (!response.ok) {
        const text = await response.text()
        throw new Error(`Paystack create recipient failed (${response.status}): ${text}`)
    }

    const result = await response.json() as {
        status: boolean
        message: string
        data: PaystackTransferRecipient
    }

    if (!result.status) {
        throw new Error(`Paystack create recipient failed: ${result.message}`)
    }

    return result.data
}

export interface PaystackTransferResult {
    id: number
    reference: string
    amount: number
    status: string           // 'pending', 'success', 'failed', 'reversed'
    transfer_code: string
    currency: string
    recipient: number
    reason: string
}

/**
 * Initiate a transfer to a vendor (NGN payout).
 * This sends money from your Paystack balance to a bank account.
 */
export async function initiateTransfer(params: {
    amount: number           // in kobo
    recipientCode: string    // From createTransferRecipient
    reason?: string
    reference?: string       // Idempotency key
    secretKey: string
}): Promise<PaystackTransferResult> {
    const response = await paystackFetch('/transfer', params.secretKey, {
        method: 'POST',
        body: JSON.stringify({
            source: 'balance',
            amount: params.amount,
            recipient: params.recipientCode,
            reason: params.reason || 'Afia Marketplace Payout',
            reference: params.reference || `AFIA-TXFR-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`,
        }),
    })

    if (!response.ok) {
        const text = await response.text()
        throw new Error(`Paystack transfer failed (${response.status}): ${text}`)
    }

    const result = await response.json() as {
        status: boolean
        message: string
        data: PaystackTransferResult
    }

    if (!result.status) {
        throw new Error(`Paystack transfer failed: ${result.message}`)
    }

    return result.data
}

// ══════════════════════════════════════════════
// 6. RESOLVE BANK ACCOUNT (Verify account before payout)
// ══════════════════════════════════════════════

export interface ResolvedBankAccount {
    account_number: string
    account_name: string
    bank_id: number
}

/**
 * Verify a bank account number against a bank code.
 * Returns the account holder's name. Use this to prevent wrong payouts.
 */
export async function resolveAccountNumber(
    accountNumber: string,
    bankCode: string,
    secretKey: string
): Promise<ResolvedBankAccount> {
    const response = await paystackFetch(
        `/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`,
        secretKey
    )

    if (!response.ok) {
        const text = await response.text()
        throw new Error(`Paystack resolve account failed (${response.status}): ${text}`)
    }

    const result = await response.json() as {
        status: boolean
        message: string
        data: ResolvedBankAccount
    }

    if (!result.status) {
        throw new Error(`Failed to resolve account: ${result.message}`)
    }

    return result.data
}

// ══════════════════════════════════════════════
// 7. LIST BANKS
// ══════════════════════════════════════════════

export interface PaystackBank {
    id: number
    name: string
    slug: string
    code: string
    active: boolean
    pay_with_bank: boolean
    country: string
    currency: string
    type: string
}

/**
 * List all banks supported by Paystack.
 * Filter by country (default: Nigeria).
 */
export async function listBanks(
    secretKey: string,
    country: string = 'nigeria',
    currency: string = 'NGN'
): Promise<PaystackBank[]> {
    const response = await paystackFetch(
        `/bank?country=${country}&currency=${currency}&perPage=100`,
        secretKey
    )

    if (!response.ok) {
        throw new Error(`Paystack list banks failed (${response.status})`)
    }

    const result = await response.json() as {
        status: boolean
        data: PaystackBank[]
    }

    return result.data || []
}

// ══════════════════════════════════════════════
// 8. UTILITY FUNCTIONS
// ══════════════════════════════════════════════

/**
 * Generate a unique idempotency key for a checkout session.
 */
export function generateIdempotencyKey(): string {
    return crypto.randomUUID()
}

/**
 * Generate a unique Paystack reference.
 * Format: AFIA-<timestamp>-<random>
 */
export function generateReference(): string {
    const timestamp = Date.now().toString(36)
    const random = crypto.randomUUID().slice(0, 8)
    return `AFIA-${timestamp}-${random}`
}

// ══════════════════════════════════════════════
// 9. TRANSFER STATUS CHECK
// ══════════════════════════════════════════════

/**
 * Paystack flat transfer fee in kobo (₦50 per NGN transfer).
 * Used by Margin Guard to calculate net profit floor.
 */
export const PAYSTACK_TRANSFER_FEE_KOBO = 5000 // ₦50

/**
 * Get the status of a Paystack transfer by transfer code.
 * Use this to verify transfer status if webhook is delayed.
 */
export async function getTransferStatus(
    transferCode: string,
    secretKey: string
): Promise<{ status: string; amount: number; currency: string; reference: string }> {
    const response = await paystackFetch(
        `/transfer/verify/${encodeURIComponent(transferCode)}`,
        secretKey
    )

    if (!response.ok) {
        const text = await response.text()
        throw new Error(`Paystack transfer verify failed (${response.status}): ${text}`)
    }

    const result = await response.json() as {
        status: boolean
        message: string
        data: { status: string; amount: number; currency: string; reference: string }
    }

    if (!result.status) {
        throw new Error(`Paystack transfer verify failed: ${result.message}`)
    }

    return result.data
}

// ══════════════════════════════════════════════
// 10. BULK TRANSFERS (Batch Payout)
// Docs: https://paystack.com/docs/transfers/bulk-transfers
// ══════════════════════════════════════════════

export interface BulkTransferItem {
    amount: number           // in kobo
    recipient: string        // recipient_code from createTransferRecipient
    reference: string        // unique reference (idempotency key)
    reason?: string
}

export interface BulkTransferResult {
    status: boolean
    message: string
    data: Array<{
        reference: string
        recipient: string
        amount: number
        status: string
        transfer_code: string
    }>
}

/**
 * Initiate a bulk transfer to multiple vendors in a single API call.
 * Paystack sends a separate `transfer.success` webhook for EACH recipient.
 * 
 * Max 100 transfers per batch (Paystack limit).
 * Each transfer uses your Paystack balance as the source.
 */
export async function initiateBulkTransfer(
    transfers: BulkTransferItem[],
    secretKey: string
): Promise<BulkTransferResult> {
    if (transfers.length > 100) {
        throw new Error('Paystack bulk transfer limit: max 100 per batch')
    }

    const response = await paystackFetch('/transfer/bulk', secretKey, {
        method: 'POST',
        body: JSON.stringify({
            source: 'balance',
            transfers: transfers.map(t => ({
                amount: t.amount,
                recipient: t.recipient,
                reference: t.reference,
                reason: t.reason || 'Neoa Marketplace Payout',
            })),
        }),
    })

    if (!response.ok) {
        const text = await response.text()
        throw new Error(`Paystack bulk transfer failed (${response.status}): ${text}`)
    }

    const result = await response.json() as BulkTransferResult

    if (!result.status) {
        throw new Error(`Paystack bulk transfer failed: ${result.message}`)
    }

    return result
}
