// ════════════════════════════════════════════
// SMILEID KYC API CLIENT
// Module 8: Real Payment Integrations
// Docs: https://docs.smileidentity.com/
// ════════════════════════════════════════════

const SMILEID_API_BASE = 'https://testapi.smileidentity.com' // Sandbox
// Production: 'https://api.smileidentity.com'

const REQUEST_TIMEOUT_MS = 30_000

// ── Types ──

export type KycJobType = 'enhanced_kyc' | 'biometric_kyc' | 'document_verification'

export interface SmileIdKycRequest {
    partnerId: string
    userId: string           // Our user ID
    jobType: KycJobType
    country: string          // 'NG', 'GH', 'KE', etc.
    idType: string           // 'BVN', 'NIN', 'VOTER_ID', etc.
    idNumber: string         // The ID value
    firstName?: string
    lastName?: string
    dob?: string             // YYYY-MM-DD
    selfieImage?: string     // Base64-encoded selfie image (for biometric KYC)
}

export interface SmileIdJobResponse {
    success: boolean
    smile_job_id: string
    result_code: string
    result_text: string
    partner_params: {
        job_id: string
        user_id: string
        job_type: number
    }
    timestamp: string
    signature: string
}

export interface SmileIdCallbackPayload {
    ResultCode: string       // '1012' = Verified, '1013' = Fraud check needed, others = failed
    ResultText: string
    SmileJobID: string
    PartnerParams: {
        job_id: string
        user_id: string
        job_type: number
    }
    Actions: {
        Verify_ID_Number: string     // 'Verified', 'Not Verified'
        Return_Personal_Info: string // 'Returned', 'Not Returned'
        Selfie_Provided?: string     // 'Approved', 'Rejected'
        Selfie_To_ID_Authority_Compare?: string
        Liveness_Check?: string      // 'Passed', 'Failed'
    }
    FullData?: {
        DOB?: string
        FullName?: string
        Address?: string
        Gender?: string
        PhoneNumber?: string
    }
    Source: string
    timestamp: string
    signature: string
}

export interface SmileIdVerificationResult {
    verified: boolean
    jobId: string
    resultCode: string
    resultText: string
    actions: SmileIdCallbackPayload['Actions']
    personalInfo?: SmileIdCallbackPayload['FullData']
}

// ── Auth: Generate signature ──

/**
 * Generate SmileID API signature.
 * SmileID expects HMAC-SHA256 of the timestamp using the API key as secret.
 */
async function generateSmileIdSignature(
    timestamp: string,
    apiKey: string,
    partnerId: string
): Promise<string> {
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(apiKey),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    )

    // SmileID SDK: HMAC-SHA256(timestamp + partnerId + "sid_request")
    const message = timestamp + partnerId + 'sid_request'
    const signatureBuffer = await crypto.subtle.sign(
        'HMAC',
        key,
        encoder.encode(message)
    )

    // Base64-encode the result
    const bytes = new Uint8Array(signatureBuffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
}

// ── Helper: Fetch with timeout ──

async function smileIdFetch(
    endpoint: string,
    body: Record<string, unknown>,
    apiKey: string,
    partnerId: string
): Promise<Response> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    // SmileID requires: yyyy-MM-dd'T'HH:mm:ss.fffK (3ms digits, UTC offset not 'Z')
    const now = new Date()
    const timestamp = now.toISOString().replace('Z', '+00:00')
    const signature = await generateSmileIdSignature(timestamp, apiKey, partnerId)

    try {
        const response = await fetch(`${SMILEID_API_BASE}${endpoint}`, {
            method: 'POST',
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                ...body,
                partner_id: partnerId,
                timestamp,
                signature,
            }),
        })
        return response
    } finally {
        clearTimeout(timeout)
    }
}

// ══════════════════════════════════════════════
// 1. SUBMIT ENHANCED KYC (BVN/NIN lookup)
// ══════════════════════════════════════════════

/**
 * Submit an Enhanced KYC request.
 * Validates identity documents (BVN, NIN, etc.) against government databases.
 * Returns immediately with a job_id for tracking.
 */
export async function submitEnhancedKyc(
    params: SmileIdKycRequest,
    apiKey: string,
    callbackUrl: string
): Promise<SmileIdJobResponse> {
    const jobId = `AFIA-KYC-${params.userId.slice(0, 8)}-${Date.now()}`

    const body: Record<string, unknown> = {
        source_sdk: 'rest_api',
        source_sdk_version: '1.0.0',
        partner_params: {
            job_id: jobId,
            user_id: params.userId,
            job_type: 5, // 5 = Enhanced KYC
        },
        id_info: {
            country: params.country,
            id_type: params.idType,
            id_number: params.idNumber,
            first_name: params.firstName || '',
            last_name: params.lastName || '',
            dob: params.dob || '',
        },
        callback_url: callbackUrl,
    }

    const res = await smileIdFetch('/v1/id_verification', body, apiKey, params.partnerId)

    if (!res.ok) {
        const errText = await res.text()
        throw new Error(`SmileID Enhanced KYC failed (${res.status}): ${errText}`)
    }

    const result = (await res.json()) as SmileIdJobResponse

    if (!result.success && result.result_code !== '0810') {
        // 0810 = "Queued", which is a valid intermediate state
        throw new Error(`SmileID KYC rejected: ${result.result_text || result.result_code}`)
    }

    return { ...result, smile_job_id: result.smile_job_id || jobId }
}

// ══════════════════════════════════════════════
// 2. SUBMIT BIOMETRIC KYC (Selfie + ID)
// ══════════════════════════════════════════════

/**
 * Submit a Biometric KYC request.
 * Compares selfie against government photo on record.
 * Requires base64-encoded selfie image.
 */
export async function submitBiometricKyc(
    params: SmileIdKycRequest,
    apiKey: string,
    callbackUrl: string
): Promise<SmileIdJobResponse> {
    if (!params.selfieImage) {
        throw new Error('Selfie image is required for Biometric KYC')
    }

    const jobId = `AFIA-BIO-${params.userId.slice(0, 8)}-${Date.now()}`

    const body: Record<string, unknown> = {
        source_sdk: 'rest_api',
        source_sdk_version: '1.0.0',
        partner_params: {
            job_id: jobId,
            user_id: params.userId,
            job_type: 1, // 1 = Biometric KYC
        },
        id_info: {
            country: params.country,
            id_type: params.idType,
            id_number: params.idNumber,
            first_name: params.firstName || '',
            last_name: params.lastName || '',
        },
        images: [
            {
                image_type_id: 2, // 2 = Selfie
                image: params.selfieImage,
            },
        ],
        callback_url: callbackUrl,
    }

    const res = await smileIdFetch('/v1/id_verification', body, apiKey, params.partnerId)

    if (!res.ok) {
        const errText = await res.text()
        throw new Error(`SmileID Biometric KYC failed (${res.status}): ${errText}`)
    }

    const result = (await res.json()) as SmileIdJobResponse
    return { ...result, smile_job_id: result.smile_job_id || jobId }
}

// ══════════════════════════════════════════════
// 2b. SUBMIT DOCUMENT VERIFICATION (International — passport/ID photo + selfie)
// Covers 100+ countries via OCR + face match
// ══════════════════════════════════════════════

/**
 * Submit a Document Verification request.
 * For countries NOT covered by Enhanced KYC (i.e., non-African countries).
 * User uploads a photo of their ID document + a live selfie.
 * SmileID uses OCR to extract data and matches the selfie to the document photo.
 */
export async function submitDocumentVerification(
    params: {
        partnerId: string
        userId: string
        country: string          // ISO 3166-1 alpha-2 (e.g., 'GB', 'US', 'DE')
        firstName?: string
        lastName?: string
        selfieImage: string      // Required — base64-encoded selfie
        idDocumentFrontImage: string  // Required — base64-encoded front of ID/passport
        idDocumentBackImage?: string  // Optional — base64-encoded back of ID
    },
    apiKey: string,
    callbackUrl: string
): Promise<SmileIdJobResponse> {
    if (!params.selfieImage) {
        throw new Error('Selfie image is required for Document Verification')
    }
    if (!params.idDocumentFrontImage) {
        throw new Error('ID document front image is required for Document Verification')
    }

    const jobId = `AFIA-DOC-${params.userId.slice(0, 8)}-${Date.now()}`

    const images: { image_type_id: number; image: string }[] = [
        { image_type_id: 2, image: params.selfieImage },          // Selfie
        { image_type_id: 0, image: params.idDocumentFrontImage }, // ID front
    ]

    if (params.idDocumentBackImage) {
        images.push({ image_type_id: 1, image: params.idDocumentBackImage }) // ID back
    }

    const body: Record<string, unknown> = {
        source_sdk: 'rest_api',
        source_sdk_version: '1.0.0',
        partner_params: {
            job_id: jobId,
            user_id: params.userId,
            job_type: 6, // 6 = Document Verification
        },
        id_info: {
            country: params.country,
            first_name: params.firstName || '',
            last_name: params.lastName || '',
        },
        images,
        callback_url: callbackUrl,
    }

    const res = await smileIdFetch('/v1/upload', body, apiKey, params.partnerId)

    if (!res.ok) {
        const errText = await res.text()
        throw new Error(`SmileID Document Verification failed (${res.status}): ${errText}`)
    }

    const result = (await res.json()) as SmileIdJobResponse
    return { ...result, smile_job_id: result.smile_job_id || jobId }
}

// ══════════════════════════════════════════════
// 3. PARSE WEBHOOK CALLBACK
// ══════════════════════════════════════════════

/**
 * Parse and validate a SmileID webhook callback.
 * Returns a structured verification result.
 */
export function parseSmileIdCallback(
    payload: SmileIdCallbackPayload
): SmileIdVerificationResult {
    // Result codes:
    // 1012 = Verified (ID exists and matches)
    // 1013 = Verified with fraud check (proceed with caution)
    // 1014 = Not verified (ID doesn't match)
    // 1015 = ID not found
    // 1016 = System error

    const isVerified =
        payload.ResultCode === '1012' &&
        payload.Actions.Verify_ID_Number === 'Verified'

    // For biometric: also check selfie
    const selfieApproved = payload.Actions.Selfie_Provided
        ? payload.Actions.Selfie_Provided === 'Approved'
        : true // No selfie = skip check

    const livenessPass = payload.Actions.Liveness_Check
        ? payload.Actions.Liveness_Check === 'Passed'
        : true // No liveness = skip check

    return {
        verified: isVerified && selfieApproved && livenessPass,
        jobId: payload.SmileJobID,
        resultCode: payload.ResultCode,
        resultText: payload.ResultText,
        actions: payload.Actions,
        personalInfo: payload.FullData,
    }
}

// ══════════════════════════════════════════════
// 4. VERIFY WEBHOOK SIGNATURE
// ══════════════════════════════════════════════

/**
 * Verify SmileID webhook signature.
 * SmileID signs callbacks with HMAC-SHA256 using the API key.
 */
export async function verifySmileIdWebhookSignature(
    payload: string,
    signature: string,
    apiKey: string
): Promise<boolean> {
    if (!signature || !apiKey || !payload) return false

    try {
        // SmileID sends signature as the HMAC-SHA256 of the raw body
        const encoder = new TextEncoder()
        const key = await crypto.subtle.importKey(
            'raw',
            encoder.encode(apiKey),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        )

        const signatureBuffer = await crypto.subtle.sign(
            'HMAC',
            key,
            encoder.encode(payload)
        )

        const expectedHash = Array.from(new Uint8Array(signatureBuffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('')

        // Constant-time comparison
        if (expectedHash.length !== signature.length) return false

        let result = 0
        for (let i = 0; i < expectedHash.length; i++) {
            result |= expectedHash.charCodeAt(i) ^ signature.charCodeAt(i)
        }

        return result === 0
    } catch {
        return false
    }
}

// ══════════════════════════════════════════════
// 5. KYC STATUS POLLING (Fallback if webhook doesn't fire)
// ══════════════════════════════════════════════

/**
 * Poll SmileID for job status.
 * Use this as a fallback if the webhook doesn't arrive within a reasonable time.
 */
export async function getJobStatus(
    partnerId: string,
    jobId: string,
    userId: string,
    apiKey: string
): Promise<SmileIdVerificationResult | null> {
    const body: Record<string, unknown> = {
        partner_params: {
            job_id: jobId,
            user_id: userId,
            job_type: 5,
        },
        image_links: false,
        history: false,
    }

    const res = await smileIdFetch('/v1/job_status', body, apiKey, partnerId)

    if (!res.ok) return null

    const data = (await res.json()) as {
        job_complete: boolean
        result?: SmileIdCallbackPayload
    }

    if (!data.job_complete || !data.result) return null

    return parseSmileIdCallback(data.result)
}
