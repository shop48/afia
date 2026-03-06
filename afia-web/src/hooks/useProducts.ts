import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// ════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════

export interface Product {
    id: string
    vendor_id: string
    title: string
    description: string | null
    base_price: number
    currency: string
    category: string | null
    images: string[]
    stock_count: number
    is_active: boolean
    created_at: string
    updated_at: string | null
    // Joined vendor info (only in catalog queries)
    vendor?: {
        full_name: string | null
        kyc_level: string
    }
}

// Max limits for validation
const MAX_TITLE_LENGTH = 150
const MAX_DESCRIPTION_LENGTH = 5000
const MAX_PRICE = 10_000_000 // $10M
const MAX_STOCK = 100_000

/** Escape special characters for Postgres ILIKE patterns */
function escapeIlike(input: string): string {
    return input.replace(/[%_\\]/g, '\\$&')
}

export interface ProductFormData {
    title: string
    description: string
    category: string
    base_price: number
    currency: string
    stock_count: number
    images: string[]
}

// ════════════════════════════════════════════
// PRODUCT CATEGORIES
// ════════════════════════════════════════════

export const PRODUCT_CATEGORIES = [
    'Electronics',
    'Fashion & Apparel',
    'Beauty & Health',
    'Home & Garden',
    'Food & Beverages',
    'Art & Crafts',
    'Jewelry & Accessories',
    'Sports & Outdoors',
    'Books & Media',
    'Other',
] as const

// ════════════════════════════════════════════
// HOOK
// ════════════════════════════════════════════

export function useProducts() {
    const { user } = useAuth()
    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // ── Fetch all active products (for public catalog) ──
    const fetchProducts = useCallback(async (opts?: {
        search?: string
        category?: string
        limit?: number
        offset?: number
    }) => {
        setLoading(true)
        setError(null)
        try {
            let query = supabase
                .from('products')
                .select(`
                    *,
                    vendor:profiles!products_vendor_id_fkey (
                        full_name,
                        kyc_level
                    )
                `)
                .eq('is_active', true)
                .gt('stock_count', 0)
                .order('created_at', { ascending: false })

            if (opts?.search) {
                const safeSearch = escapeIlike(opts.search.trim())
                query = query.ilike('title', `%${safeSearch}%`)
            }
            if (opts?.category) {
                query = query.eq('category', opts.category)
            }
            if (opts?.limit) {
                query = query.limit(opts.limit)
            }
            if (opts?.offset) {
                query = query.range(opts.offset, opts.offset + (opts.limit || 20) - 1)
            }

            const { data, error: err } = await query

            if (err) {
                setError(err.message)
                return []
            }

            const mapped = (data || []).map(p => ({
                ...p,
                images: p.images || [],
                vendor: Array.isArray(p.vendor) ? p.vendor[0] : p.vendor,
            })) as Product[]

            setProducts(mapped)
            return mapped
        } catch {
            setError('Failed to fetch products')
            return []
        } finally {
            setLoading(false)
        }
    }, [])

    // ── Fetch single product by ID ──
    const fetchProduct = useCallback(async (productId: string): Promise<Product | null> => {
        setLoading(true)
        setError(null)
        try {
            const { data, error: err } = await supabase
                .from('products')
                .select(`
                    *,
                    vendor:profiles!products_vendor_id_fkey (
                        full_name,
                        kyc_level
                    )
                `)
                .eq('id', productId)
                .single()

            if (err) {
                setError(err.message)
                return null
            }

            return {
                ...data,
                images: data.images || [],
                vendor: Array.isArray(data.vendor) ? data.vendor[0] : data.vendor,
            } as Product
        } catch {
            setError('Failed to fetch product')
            return null
        } finally {
            setLoading(false)
        }
    }, [])

    // ── Fetch products for current vendor ──
    const fetchVendorProducts = useCallback(async () => {
        if (!user) return []
        setLoading(true)
        setError(null)
        try {
            const { data, error: err } = await supabase
                .from('products')
                .select('*')
                .eq('vendor_id', user.id)
                .order('created_at', { ascending: false })

            if (err) {
                setError(err.message)
                return []
            }

            const mapped = (data || []).map(p => ({
                ...p,
                images: p.images || [],
            })) as Product[]

            setProducts(mapped)
            return mapped
        } catch {
            setError('Failed to fetch vendor products')
            return []
        } finally {
            setLoading(false)
        }
    }, [user])

    // ── Create product ──
    const createProduct = useCallback(async (form: ProductFormData): Promise<{ data: Product | null; error: string | null }> => {
        if (!user) return { data: null, error: 'Not authenticated' }
        setLoading(true)
        setError(null)
        try {
            // Validate limits before sending to DB
            const title = form.title.trim()
            if (title.length < 3 || title.length > MAX_TITLE_LENGTH) {
                return { data: null, error: `Title must be 3–${MAX_TITLE_LENGTH} characters` }
            }
            if (form.base_price <= 0 || form.base_price > MAX_PRICE) {
                return { data: null, error: `Price must be between 0 and ${MAX_PRICE.toLocaleString()}` }
            }
            if (form.stock_count < 0 || form.stock_count > MAX_STOCK) {
                return { data: null, error: `Stock must be between 0 and ${MAX_STOCK.toLocaleString()}` }
            }
            const description = form.description.trim()
            if (description.length > MAX_DESCRIPTION_LENGTH) {
                return { data: null, error: `Description must be under ${MAX_DESCRIPTION_LENGTH.toLocaleString()} characters` }
            }

            const { data, error: err } = await supabase
                .from('products')
                .insert({
                    vendor_id: user.id,
                    title,
                    description: description || null,
                    category: form.category || null,
                    base_price: form.base_price,
                    currency: form.currency,
                    stock_count: form.stock_count,
                    images: form.images,
                    is_active: true,
                })
                .select()
                .single()

            if (err) {
                setError(err.message)
                return { data: null, error: err.message }
            }

            return { data: data as Product, error: null }
        } catch {
            const msg = 'Failed to create product'
            setError(msg)
            return { data: null, error: msg }
        } finally {
            setLoading(false)
        }
    }, [user])

    // ── Update product ──
    const updateProduct = useCallback(async (productId: string, form: Partial<ProductFormData>): Promise<{ error: string | null }> => {
        if (!user) return { error: 'Not authenticated' }
        setLoading(true)
        setError(null)
        try {
            const updates: Record<string, unknown> = {}
            if (form.title !== undefined) updates.title = form.title.trim()
            if (form.description !== undefined) updates.description = form.description.trim() || null
            if (form.category !== undefined) updates.category = form.category || null
            if (form.base_price !== undefined) updates.base_price = form.base_price
            if (form.currency !== undefined) updates.currency = form.currency
            if (form.stock_count !== undefined) updates.stock_count = form.stock_count
            if (form.images !== undefined) updates.images = form.images

            const { error: err } = await supabase
                .from('products')
                .update(updates)
                .eq('id', productId)
                .eq('vendor_id', user.id)

            if (err) {
                setError(err.message)
                return { error: err.message }
            }

            return { error: null }
        } catch {
            const msg = 'Failed to update product'
            setError(msg)
            return { error: msg }
        } finally {
            setLoading(false)
        }
    }, [user])

    // ── Delete product (soft delete — set is_active = false) ──
    const deleteProduct = useCallback(async (productId: string): Promise<{ error: string | null }> => {
        if (!user) return { error: 'Not authenticated' }
        try {
            const { error: err } = await supabase
                .from('products')
                .update({ is_active: false })
                .eq('id', productId)
                .eq('vendor_id', user.id)

            if (err) return { error: err.message }
            return { error: null }
        } catch {
            return { error: 'Failed to delete product' }
        }
    }, [user])

    return {
        products,
        loading,
        error,
        fetchProducts,
        fetchProduct,
        fetchVendorProducts,
        createProduct,
        updateProduct,
        deleteProduct,
    }
}
