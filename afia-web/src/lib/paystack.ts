// ════════════════════════════════════════════
// PAYSTACK INLINE SDK LOADER
// Module 4: Checkout & Escrow Vaulting
// Loads Paystack popup via script tag (official method)
// ════════════════════════════════════════════

declare global {
    interface Window {
        PaystackPop: {
            setup: (config: PaystackConfig) => { openIframe: () => void }
        }
    }
}

export interface PaystackConfig {
    key: string
    email: string
    amount: number // in kobo
    ref?: string
    currency?: string
    channels?: string[]
    callback: (response: { reference: string; status: string }) => void
    onClose: () => void
    metadata?: Record<string, unknown>
}

let scriptLoaded = false
let scriptLoading = false
const loadCallbacks: Array<{ resolve: () => void; reject: (err: Error) => void }> = []

/**
 * Load the Paystack inline script if not already loaded.
 * Returns a promise that resolves when the script is ready.
 */
export function loadPaystackScript(): Promise<void> {
    return new Promise((resolve, reject) => {
        if (scriptLoaded && window.PaystackPop) {
            resolve()
            return
        }

        loadCallbacks.push({ resolve, reject })

        if (scriptLoading) return // Already loading, just queue the callback

        scriptLoading = true

        const script = document.createElement('script')
        script.src = 'https://js.paystack.co/v1/inline.js'
        script.async = true

        script.onload = () => {
            scriptLoaded = true
            scriptLoading = false
            loadCallbacks.forEach(cb => cb.resolve())
            loadCallbacks.length = 0
        }

        script.onerror = () => {
            scriptLoading = false
            const error = new Error('Failed to load Paystack script. Check your internet connection.')
            loadCallbacks.forEach(cb => cb.reject(error))
            loadCallbacks.length = 0
        }

        document.head.appendChild(script)
    })
}

/**
 * Open the Paystack inline payment popup.
 * Call loadPaystackScript() first.
 */
export function openPaystackPopup(config: PaystackConfig): void {
    if (!window.PaystackPop) {
        throw new Error('Paystack script not loaded. Call loadPaystackScript() first.')
    }

    const handler = window.PaystackPop.setup(config)
    handler.openIframe()
}
