import { useState, useCallback } from 'react'
import { apiClient } from '../lib/api'

// ══════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════

export interface OrderProduct {
    id: string
    title: string
    images: string[] | null
    base_price: number
    currency: string
    description?: string
}

export interface OrderEscrow {
    gross_amount: number
    fee_amount: number
    net_payout: number
    status: string
    margin_check_passed?: boolean
}

export interface OrderVendor {
    id: string
    full_name: string | null
    kyc_level?: string
}

export interface OrderBuyer {
    id: string
    full_name: string | null
}

export interface Order {
    id: string
    status: string
    paystack_ref: string
    total_amount: number
    currency: string
    quantity: number
    shipping_type: string | null
    waybill_url: string | null
    courier_phone: string | null
    tracking_id: string | null
    estimated_delivery_date: string | null
    shipped_at: string | null
    delivered_at: string | null
    auto_release_at: string | null
    is_disputed: boolean
    dispute_reason: string | null
    dispute_category: string | null
    dispute_evidence_urls: string[] | null
    disputed_at: string | null
    admin_notes: string | null
    resolved_at: string | null
    resolved_by: string | null
    created_at: string
    product: OrderProduct | OrderProduct[]
    escrow: OrderEscrow | OrderEscrow[]
    vendor?: OrderVendor | OrderVendor[]
    buyer?: OrderBuyer | OrderBuyer[]
}

interface PaginatedOrders {
    orders: Order[]
    pagination: {
        page: number
        limit: number
        total: number
        pages: number
    }
}

// ══════════════════════════════════════════════
// HELPERS — normalize Supabase join results
// ══════════════════════════════════════════════

export function getProduct(order: Order): OrderProduct | null {
    return Array.isArray(order.product) ? order.product[0] || null : order.product
}

export function getEscrow(order: Order): OrderEscrow | null {
    return Array.isArray(order.escrow) ? order.escrow[0] || null : order.escrow
}

export function getVendor(order: Order): OrderVendor | null {
    if (!order.vendor) return null
    return Array.isArray(order.vendor) ? order.vendor[0] || null : order.vendor
}

export function getBuyer(order: Order): OrderBuyer | null {
    if (!order.buyer) return null
    return Array.isArray(order.buyer) ? order.buyer[0] || null : order.buyer
}

// ══════════════════════════════════════════════
// ORDER STATUS → STEP INDEX MAPPING
// ══════════════════════════════════════════════

const STATUS_TO_STEP: Record<string, number> = {
    AWAITING_PAYMENT: 0,
    PAID: 1,
    // 2 = "Vaulted" (escrow locked)
    // 3 = "Fulfilling" (vendor choosing rail)
    SHIPPED: 4,
    // 5 = "In Transit"
    DELIVERED: 6,
    // 7 = "Buffer" (48h dispute window)
    COMPLETED: 8,
    // 9 = "Settled" (payout sent)
}

export function getStepFromStatus(status: string, escrowStatus?: string): number {
    // If escrow is LOCKED and order is PAID, show step 2 (Vaulted)
    if (status === 'PAID' && escrowStatus === 'LOCKED') return 2

    // If COMPLETED and escrow RELEASED, show step 9 (Settled)
    if (status === 'COMPLETED' && escrowStatus === 'RELEASED') return 9

    // If DELIVERED, show step 7 (Buffer / dispute window)
    if (status === 'DELIVERED') return 7

    return STATUS_TO_STEP[status] ?? 0
}

// ══════════════════════════════════════════════
// HOOK
// ══════════════════════════════════════════════

export function useOrders() {
    const [orders, setOrders] = useState<Order[]>([])
    const [currentOrder, setCurrentOrder] = useState<Order | null>(null)
    const [loading, setLoading] = useState(false)
    const [acting, setActing] = useState(false) // separate loading state for mutations
    const [error, setError] = useState<string | null>(null)
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 })

    // ── Buyer: Fetch my orders ──
    const fetchBuyerOrders = useCallback(async (page = 1) => {
        setLoading(true)
        setError(null)
        try {
            const data = await apiClient<PaginatedOrders>(`/api/orders?page=${page}&limit=20`)
            setOrders(data.orders)
            setPagination(data.pagination)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch orders')
        } finally {
            setLoading(false)
        }
    }, [])

    // ── Vendor: Fetch my orders ──
    const fetchVendorOrders = useCallback(async (status?: string, page = 1) => {
        setLoading(true)
        setError(null)
        try {
            const params = new URLSearchParams({ page: String(page), limit: '20' })
            if (status) params.set('status', status)
            const data = await apiClient<PaginatedOrders>(`/api/vendor/orders?${params}`)
            setOrders(data.orders)
            setPagination(data.pagination)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch orders')
        } finally {
            setLoading(false)
        }
    }, [])

    // ── Fetch single order detail ──
    const fetchOrderDetail = useCallback(async (orderId: string) => {
        setLoading(true)
        setError(null)
        try {
            const data = await apiClient<Order>(`/api/orders/${encodeURIComponent(orderId)}`)
            setCurrentOrder(data)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch order')
        } finally {
            setLoading(false)
        }
    }, [])

    // ── Buyer: Confirm delivery ──
    const confirmDelivery = useCallback(async (orderId: string) => {
        setActing(true)
        setError(null)
        try {
            const data = await apiClient<{ message: string; auto_release_at: string }>(
                `/api/orders/${encodeURIComponent(orderId)}/confirm-delivery`,
                { method: 'POST' }
            )
            // Update local state
            setCurrentOrder(prev => prev ? { ...prev, status: 'DELIVERED', auto_release_at: data.auto_release_at } : null)
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'DELIVERED', auto_release_at: data.auto_release_at } : o))
            return data
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to confirm delivery'
            setError(msg)
            throw new Error(msg)
        } finally {
            setActing(false)
        }
    }, [])

    // ── Buyer: File dispute ──
    const reportDispute = useCallback(async (
        orderId: string,
        reason: string,
        category: string,
        evidenceUrls?: string[]
    ) => {
        setActing(true)
        setError(null)
        try {
            const data = await apiClient<{ message: string }>(
                `/api/orders/${encodeURIComponent(orderId)}/dispute`,
                {
                    method: 'POST',
                    body: JSON.stringify({ reason, category, evidenceUrls: evidenceUrls || [] }),
                }
            )
            const disputeUpdate = {
                status: 'DISPUTED',
                is_disputed: true,
                dispute_category: category,
                dispute_reason: reason,
                dispute_evidence_urls: evidenceUrls || null,
                disputed_at: new Date().toISOString(),
            }
            setCurrentOrder(prev => prev ? { ...prev, ...disputeUpdate } : null)
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...disputeUpdate } : o))
            return data
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to file dispute'
            setError(msg)
            throw new Error(msg)
        } finally {
            setActing(false)
        }
    }, [])

    // ── Vendor: Fulfill order (Rail 1 or Rail 2) ──
    const fulfillOrder = useCallback(async (
        orderId: string,
        rail: 'rail1' | 'rail2',
        data: {
            trackingId?: string
            carrier?: string
            waybillUrl?: string
            courierPhone?: string
            estimatedDeliveryDate?: string
        }
    ) => {
        setActing(true)
        setError(null)
        try {
            const result = await apiClient<{ message: string }>(
                `/api/logistics/${rail}`,
                { method: 'POST', body: JSON.stringify({ orderId, ...data }) }
            )
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'SHIPPED' } : o))
            return result
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to fulfill order'
            setError(msg)
            throw new Error(msg)
        } finally {
            setActing(false)
        }
    }, [])

    return {
        orders,
        currentOrder,
        loading,
        acting,
        error,
        pagination,
        fetchBuyerOrders,
        fetchVendorOrders,
        fetchOrderDetail,
        confirmDelivery,
        reportDispute,
        fulfillOrder,
    }
}
