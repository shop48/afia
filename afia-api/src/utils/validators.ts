// ════════════════════════════════════════════
// MODULE 10: INPUT VALIDATION & SANITIZATION
// Centralized validators for all API routes
// ════════════════════════════════════════════

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const HTML_TAG_RE = /<\/?[^>]+(>|$)/g
const SCRIPT_RE = /<script[\s\S]*?<\/script>/gi
const EVENT_HANDLER_RE = /\bon\w+\s*=\s*["'][^"']*["']/gi

/** Supported currencies whitelist */
const VALID_CURRENCIES = new Set([
    'USD', 'NGN', 'GBP', 'EUR', 'GHS', 'KES', 'ZAR', 'GNF', 'XOF', 'CAD',
])

/**
 * Validate a UUID v4 string.
 */
export function isValidUUID(str: unknown): str is string {
    return typeof str === 'string' && UUID_RE.test(str)
}

/**
 * Validate a basic email format.
 * Not a full RFC 5322 check — just prevents obvious garbage.
 */
export function isValidEmail(str: unknown): str is string {
    return typeof str === 'string' && str.length <= 254 && EMAIL_RE.test(str)
}

/**
 * Validate a currency code against the supported whitelist.
 */
export function isValidCurrency(str: unknown): str is string {
    return typeof str === 'string' && VALID_CURRENCIES.has(str.toUpperCase())
}

/**
 * Strip HTML tags, script blocks, and event handlers from a string.
 * Prevents XSS when values are rendered in admin dashboards or emails.
 */
export function stripHtml(str: string): string {
    return str
        .replace(SCRIPT_RE, '')      // Remove <script>...</script>
        .replace(EVENT_HANDLER_RE, '') // Remove onclick="..." etc.
        .replace(HTML_TAG_RE, '')     // Remove remaining HTML tags
}

/**
 * Sanitize a string input:
 * 1. Trim whitespace
 * 2. Strip HTML/scripts
 * 3. Enforce max length
 * 4. Reject null bytes
 *
 * Returns null if the input is invalid (not a string).
 */
export function sanitizeString(
    input: unknown,
    maxLength: number = 1000
): string | null {
    if (typeof input !== 'string') return null

    let cleaned = input.trim()

    // Reject null bytes (common in injection attacks)
    if (cleaned.includes('\0')) return null

    // Strip HTML
    cleaned = stripHtml(cleaned)

    // Enforce max length
    if (cleaned.length > maxLength) {
        cleaned = cleaned.slice(0, maxLength)
    }

    return cleaned
}

/**
 * Sanitize and validate a numeric input.
 * Returns null if the value is not a valid finite number or is out of range.
 */
export function sanitizeNumber(
    input: unknown,
    min: number = 0,
    max: number = Number.MAX_SAFE_INTEGER
): number | null {
    const num = typeof input === 'string' ? Number(input) : input as number

    if (typeof num !== 'number' || !Number.isFinite(num)) return null
    if (num < min || num > max) return null

    return num
}

/**
 * Validate a positive integer (e.g. quantity, page number).
 */
export function isPositiveInteger(input: unknown): input is number {
    const num = typeof input === 'string' ? Number(input) : input as number
    return typeof num === 'number' && Number.isInteger(num) && num > 0
}

/**
 * Validate a URL string. Only allows http/https schemes.
 */
export function isValidUrl(input: unknown): input is string {
    if (typeof input !== 'string' || input.length > 2048) return false
    try {
        const url = new URL(input)
        return url.protocol === 'http:' || url.protocol === 'https:'
    } catch {
        return false
    }
}

/**
 * Validate an ISO 8601 date string.
 */
export function isValidISODate(input: unknown): input is string {
    if (typeof input !== 'string') return false
    const date = new Date(input)
    return !isNaN(date.getTime())
}

/**
 * Validate a phone number (basic international format).
 * Allows digits, spaces, +, -, (, ) only.
 */
export function isValidPhone(input: unknown): input is string {
    if (typeof input !== 'string') return false
    return /^[+\d][\d\s\-()]{6,20}$/.test(input)
}

/**
 * Validate a bank code (alphanumeric, 3-20 chars).
 */
export function isValidBankCode(input: unknown): input is string {
    if (typeof input !== 'string') return false
    return /^[a-zA-Z0-9]{3,20}$/.test(input)
}

/**
 * Validate an account number (digits only, 5-20 chars).
 */
export function isValidAccountNumber(input: unknown): input is string {
    if (typeof input !== 'string') return false
    return /^\d{5,20}$/.test(input)
}

/**
 * Parse and validate JSON body safely from a Request.
 * Returns { data, error } to avoid try/catch at every route.
 */
export async function parseJsonBody<T = Record<string, unknown>>(
    req: { json: () => Promise<T> }
): Promise<{ data: T | null; error: string | null }> {
    try {
        const data = await req.json()
        if (typeof data !== 'object' || data === null) {
            return { data: null, error: 'Request body must be a JSON object' }
        }
        return { data, error: null }
    } catch {
        return { data: null, error: 'Invalid JSON body' }
    }
}
