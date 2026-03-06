import { useState, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { loadPaystackScript, openPaystackPopup } from '../lib/paystack'
import type { Product } from './useProducts'

// ════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════

export interface CheckoutData {
    authorization_url: string
    access_code: string
    reference: string
    amount_ngn: number
    amount_kobo: number
    fx_rate: number | null
    idempotency_key: string
    product: {
        id: string
        title: string
        base_price: number
        currency: string
        vendor_name: string | null
    }
}

export interface OrderResult {
    id: string
    status: string
    paystack_ref: string
    total_amount: number
    currency: string
    created_at: string
}

// ════════════════════════════════════════════
// HOOK
// ════════════════════════════════════════════

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787'
const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || ''

export function useCheckout() {
    const { session, user } = useAuth()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null)

    /**
     * Step 1: Initialize payment on the backend.
     * This creates a Paystack transaction and returns the reference.
     */
    const initializePayment = useCallback(async (
        product: Product,
        quantity: number
    ): Promise<CheckoutData | null> => {
        if (!session?.access_token) {
            setError('Please log in to make a purchase')
            return null
        }

        setLoading(true)
        setError(null)

        try {
            const response = await fetch(`${API_URL}/api/checkout/initialize`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    productId: product.id,
                    quantity,
                }),
            })

            if (!response.ok) {
                const errData = await response.json() as { error: string }
                throw new Error(errData.error || 'Failed to initialize payment')
            }

            const data = await response.json() as CheckoutData
            setCheckoutData(data)
            return data
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Payment initialization failed'
            setError(message)
            return null
        } finally {
            setLoading(false)
        }
    }, [session])

    /**
     * Step 2: Open Paystack inline popup.
     * Uses the reference from initializePayment.
     */
    const payWithPaystack = useCallback(async (
        onSuccess: (reference: string) => void,
        onClose?: () => void,
        overrideData?: CheckoutData | null
    ) => {
        const data = overrideData || checkoutData
        if (!data) {
            setError('No checkout data. Initialize payment first.')
            return
        }

        if (!PAYSTACK_PUBLIC_KEY) {
            setError('Paystack public key not configured. Add VITE_PAYSTACK_PUBLIC_KEY to your .env file.')
            return
        }

        try {
            setLoading(true)
            await loadPaystackScript()

            openPaystackPopup({
                key: PAYSTACK_PUBLIC_KEY,
                email: user?.email || '',
                amount: data.amount_kobo,
                ref: data.reference,
                currency: 'NGN',
                callback: (response) => {
                    setLoading(false)
                    onSuccess(response.reference)
                },
                onClose: () => {
                    setLoading(false)
                    onClose?.()
                },
            })
        } catch (err) {
            setLoading(false)
            const message = err instanceof Error ? err.message : 'Failed to open payment popup'
            setError(message)
        }
    }, [checkoutData, user])

    /**
     * Step 3: Verify payment on the backend — fetch the created order.
     */
    const verifyPayment = useCallback(async (reference: string): Promise<OrderResult | null> => {
        if (!session?.access_token) return null

        setLoading(true)
        try {
            const response = await fetch(`${API_URL}/api/orders/by-ref/${reference}`, {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                },
            })

            if (!response.ok) return null

            const order = await response.json() as OrderResult
            return order
        } catch {
            return null
        } finally {
            setLoading(false)
        }
    }, [session])

    /**
     * Step 3b: Server-side Paystack verification (Module 8).
     * Calls /api/checkout/verify which verifies directly with Paystack API.
     * Prevents client-side spoofing of payment success.
     */
    const verifyPaymentServerSide = useCallback(async (reference: string): Promise<{
        verified: boolean
        status: string
        amount?: number
        currency?: string
    } | null> => {
        if (!session?.access_token) return null

        setLoading(true)
        try {
            const response = await fetch(`${API_URL}/api/checkout/verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ reference }),
            })

            if (!response.ok) return null

            return await response.json() as {
                verified: boolean
                status: string
                amount?: number
                currency?: string
            }
        } catch {
            return null
        } finally {
            setLoading(false)
        }
    }, [session])

    /**
     * Fetch all buyer orders.
     */
    const fetchOrders = useCallback(async () => {
        if (!session?.access_token) return []

        try {
            const response = await fetch(`${API_URL}/api/orders`, {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                },
            })

            if (!response.ok) return []
            return await response.json()
        } catch {
            return []
        }
    }, [session])

    const clearError = useCallback(() => setError(null), [])

    return {
        loading,
        error,
        checkoutData,
        initializePayment,
        payWithPaystack,
        verifyPayment,
        verifyPaymentServerSide,
        fetchOrders,
        clearError,
    }
}
