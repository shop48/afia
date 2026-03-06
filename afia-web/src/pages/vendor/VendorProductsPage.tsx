import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import AppShell from '../../components/layout/AppShell'
import ProductFormModal from '../../components/vendor/ProductFormModal'
import { useProducts, type Product, type ProductFormData } from '../../hooks/useProducts'
import { Badge, Skeleton } from '../../components/ui'
import { toast } from '../../components/ui/Toast'
import { formatCurrency } from '../../lib/currency'
import {
    Plus, Package, Pencil, Trash2, Eye, EyeOff,
    AlertCircle, ShieldCheck, MoreVertical
} from 'lucide-react'

export default function VendorProductsPage() {
    const { profile, signOut } = useAuth()
    const navigate = useNavigate()
    const { products, loading, fetchVendorProducts, createProduct, updateProduct, deleteProduct } = useProducts()

    const [showForm, setShowForm] = useState(false)
    const [editingProduct, setEditingProduct] = useState<Product | null>(null)
    const [submitting, setSubmitting] = useState(false)
    const [actionMenuId, setActionMenuId] = useState<string | null>(null)

    const isVerified = profile?.kyc_level === 'VERIFIED'

    // Fetch products on mount
    useEffect(() => {
        fetchVendorProducts()
    }, [fetchVendorProducts])

    const handleCreate = useCallback(async (data: ProductFormData) => {
        setSubmitting(true)
        const { error } = await createProduct(data)
        setSubmitting(false)
        if (error) {
            toast(`Failed to create: ${error}`, 'error')
            return
        }
        toast('Product created successfully!', 'success')
        setShowForm(false)
        fetchVendorProducts()
    }, [createProduct, fetchVendorProducts])

    const handleUpdate = useCallback(async (data: ProductFormData) => {
        if (!editingProduct) return
        setSubmitting(true)
        const { error } = await updateProduct(editingProduct.id, data)
        setSubmitting(false)
        if (error) {
            toast(`Failed to update: ${error}`, 'error')
            return
        }
        toast('Product updated!', 'success')
        setEditingProduct(null)
        fetchVendorProducts()
    }, [editingProduct, updateProduct, fetchVendorProducts])

    const handleDelete = useCallback(async (product: Product) => {
        if (!confirm(`Delete "${product.title}"? This action cannot be undone.`)) return
        const { error } = await deleteProduct(product.id)
        if (error) {
            toast(`Failed to delete: ${error}`, 'error')
            return
        }
        toast('Product deleted', 'success')
        fetchVendorProducts()
    }, [deleteProduct, fetchVendorProducts])

    return (
        <AppShell
            role="VENDOR"
            activePath="/vendor/products"
            userName={profile?.full_name || 'Vendor'}
            onNavigate={(path) => navigate(path)}
            onLogout={signOut}
        >
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
            >
                {/* Page Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl lg:text-3xl font-bold text-navy font-[family-name:var(--font-heading)]">
                            My Products
                        </h1>
                        <p className="text-platinum-dark mt-1">
                            {products.length} product{products.length !== 1 ? 's' : ''} listed
                        </p>
                    </div>
                    {isVerified && (
                        <button
                            onClick={() => { setEditingProduct(null); setShowForm(true) }}
                            className="flex items-center gap-2 px-5 py-2.5 bg-gold text-navy-dark font-semibold text-sm
                                rounded-full hover:bg-gold-light transition-colors cursor-pointer shadow-sm"
                        >
                            <Plus className="w-4 h-4" />
                            Add Product
                        </button>
                    )}
                </div>

                {/* KYC Gate for unverified vendors */}
                {!isVerified && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-6 p-6 bg-gold/10 border border-gold/30 rounded-xl flex items-start gap-4"
                    >
                        <div className="w-12 h-12 rounded-xl bg-gold/20 flex items-center justify-center shrink-0">
                            <AlertCircle className="w-6 h-6 text-gold-dark" />
                        </div>
                        <div>
                            <p className="text-base font-semibold text-navy">Identity Verification Required</p>
                            <p className="text-sm text-platinum-dark mt-1 leading-relaxed">
                                You must complete SmileID verification before you can list products.
                                Verified vendors earn the <strong>"Verified by SmileID"</strong> trust badge, increasing buyer confidence.
                            </p>
                            <button className="mt-4 px-5 py-2.5 text-sm font-bold bg-gold text-navy-dark rounded-full hover:bg-gold-light transition-colors cursor-pointer">
                                Start Verification →
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* Loading State */}
                {loading && products.length === 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-white rounded-xl border border-platinum p-4">
                                <Skeleton className="w-full aspect-[4/3] rounded-lg mb-3" />
                                <Skeleton className="w-3/4 h-5 mb-2" />
                                <Skeleton className="w-1/2 h-4" />
                            </div>
                        ))}
                    </div>
                )}

                {/* Empty State */}
                {!loading && products.length === 0 && isVerified && (
                    <div className="bg-white rounded-2xl border border-platinum p-12 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-platinum-light flex items-center justify-center mx-auto mb-4">
                            <Package className="w-8 h-8 text-platinum-dark" />
                        </div>
                        <h3 className="text-lg font-semibold text-navy font-[family-name:var(--font-heading)] mb-2">
                            No products yet
                        </h3>
                        <p className="text-platinum-dark text-sm max-w-sm mx-auto mb-6">
                            Create your first product listing to start selling globally with escrow protection.
                        </p>
                        <button
                            onClick={() => { setEditingProduct(null); setShowForm(true) }}
                            className="px-6 py-2.5 bg-gold text-navy-dark font-semibold rounded-full hover:bg-gold-light transition-colors cursor-pointer shadow-sm"
                        >
                            <Plus className="w-4 h-4 inline mr-2" />
                            Add Your First Product
                        </button>
                    </div>
                )}

                {/* Product Grid */}
                {products.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <AnimatePresence>
                            {products.map((product, i) => (
                                <motion.div
                                    key={product.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="bg-white rounded-xl border border-platinum overflow-hidden group hover:shadow-md transition-shadow"
                                >
                                    {/* Product Image */}
                                    <div className="aspect-[4/3] relative bg-platinum-light overflow-hidden">
                                        {product.images.length > 0 ? (
                                            <img
                                                src={product.images[0]}
                                                alt={product.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Package className="w-12 h-12 text-platinum-dark" />
                                            </div>
                                        )}

                                        {/* Status badges */}
                                        <div className="absolute top-2 left-2 flex gap-1.5">
                                            {product.stock_count === 0 && (
                                                <span className="px-2 py-0.5 bg-ruby text-white text-[10px] font-bold rounded-md">
                                                    Out of Stock
                                                </span>
                                            )}
                                            {!product.is_active && (
                                                <span className="px-2 py-0.5 bg-navy/70 text-white text-[10px] font-bold rounded-md flex items-center gap-1">
                                                    <EyeOff className="w-3 h-3" /> Hidden
                                                </span>
                                            )}
                                        </div>

                                        {/* Action menu toggle */}
                                        <div className="absolute top-2 right-2">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setActionMenuId(actionMenuId === product.id ? null : product.id)
                                                }}
                                                className="w-8 h-8 rounded-lg bg-white/80 backdrop-blur-sm flex items-center justify-center 
                                                    opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-white shadow-sm"
                                            >
                                                <MoreVertical className="w-4 h-4 text-navy" />
                                            </button>

                                            {/* Action Dropdown */}
                                            <AnimatePresence>
                                                {actionMenuId === product.id && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: -5, scale: 0.95 }}
                                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                                        exit={{ opacity: 0, y: -5, scale: 0.95 }}
                                                        className="absolute right-0 top-10 bg-white rounded-lg shadow-lg border border-platinum py-1 min-w-[140px] z-10"
                                                    >
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                setEditingProduct(product)
                                                                setShowForm(true)
                                                                setActionMenuId(null)
                                                            }}
                                                            className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-platinum-light transition-colors cursor-pointer"
                                                        >
                                                            <Pencil className="w-3.5 h-3.5" /> Edit
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                navigate(`/catalog/${product.id}`)
                                                                setActionMenuId(null)
                                                            }}
                                                            className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-platinum-light transition-colors cursor-pointer"
                                                        >
                                                            <Eye className="w-3.5 h-3.5" /> View
                                                        </button>
                                                        <div className="border-t border-platinum my-1" />
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                handleDelete(product)
                                                                setActionMenuId(null)
                                                            }}
                                                            className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 text-ruby hover:bg-ruby/5 transition-colors cursor-pointer"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" /> Delete
                                                        </button>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>

                                    {/* Product Info */}
                                    <div className="p-4">
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <h3 className="font-semibold text-navy text-sm truncate flex-1">
                                                {product.title}
                                            </h3>
                                            {product.category && (
                                                <Badge variant="default">
                                                    {product.category}
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-lg font-bold text-navy">
                                            {formatCurrency(product.base_price, product.currency)}
                                        </p>
                                        <div className="flex items-center justify-between mt-2">
                                            <span className="text-xs text-platinum-dark">
                                                Stock: <strong className={product.stock_count === 0 ? 'text-ruby' : 'text-navy'}>{product.stock_count}</strong>
                                            </span>
                                            <div className="flex items-center gap-1 text-xs text-neoa-emerald">
                                                <ShieldCheck className="w-3.5 h-3.5" />
                                                Escrow Protected
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </motion.div>

            {/* Product Form Modal */}
            <ProductFormModal
                open={showForm}
                onClose={() => { setShowForm(false); setEditingProduct(null) }}
                onSubmit={editingProduct ? handleUpdate : handleCreate}
                product={editingProduct}
                submitting={submitting}
            />
        </AppShell>
    )
}
