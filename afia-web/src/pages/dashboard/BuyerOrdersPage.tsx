import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'
import AppShell from '../../components/layout/AppShell'
import { useNavigate } from 'react-router-dom'
import { ShoppingBag, Package, ChevronRight, Clock, Truck, CheckCircle, AlertTriangle } from 'lucide-react'
import { Badge } from '../../components/ui'
import { useOrders, getProduct, getEscrow } from '../../hooks/useOrders'
import { formatCurrency } from '../../lib/currency'
import { useState } from 'react'

const STATUS_VARIANT: Record<string, string> = {
    PAID: 'pending',
    SHIPPED: 'locked',
    DELIVERED: 'verified',
    COMPLETED: 'released',
    DISPUTED: 'disputed',
    REFUNDED: 'disputed',
}

const STATUS_ICON: Record<string, React.ReactNode> = {
    PAID: <Clock className="w-3.5 h-3.5" />,
    SHIPPED: <Truck className="w-3.5 h-3.5" />,
    DELIVERED: <CheckCircle className="w-3.5 h-3.5" />,
    COMPLETED: <CheckCircle className="w-3.5 h-3.5" />,
    DISPUTED: <AlertTriangle className="w-3.5 h-3.5" />,
    REFUNDED: <AlertTriangle className="w-3.5 h-3.5" />,
}

const STATUS_FILTERS = ['ALL', 'PAID', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'DISPUTED'] as const

export default function BuyerOrdersPage() {
    const { profile, signOut } = useAuth()
    const navigate = useNavigate()
    const { orders, loading, error, fetchBuyerOrders, pagination } = useOrders()
    const [statusFilter, setStatusFilter] = useState<string>('ALL')

    useEffect(() => {
        fetchBuyerOrders()
    }, [fetchBuyerOrders])

    const filteredOrders = statusFilter === 'ALL'
        ? orders
        : orders.filter(o => o.status === statusFilter)

    return (
        <AppShell
            role="BUYER"
            activePath="/orders"
            userName={profile?.full_name || 'Buyer'}
            onNavigate={(path) => navigate(path)}
            onLogout={signOut}
        >
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
            >
                {/* Page Header */}
                <div className="mb-6">
                    <h1 className="text-2xl lg:text-3xl font-bold text-navy font-[family-name:var(--font-heading)]">
                        My Orders
                    </h1>
                    <p className="text-platinum-dark mt-1">Track and manage all your purchases</p>
                </div>

                {/* Status Filter Pills */}
                <div className="flex flex-wrap gap-2 mb-6">
                    {STATUS_FILTERS.map(status => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`
                                px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer
                                ${statusFilter === status
                                    ? 'bg-gold text-navy-dark shadow-sm'
                                    : 'bg-white text-platinum-dark border border-platinum hover:border-gold/40'
                                }
                            `}
                        >
                            {status === 'ALL' ? 'All Orders' : status}
                        </button>
                    ))}
                </div>

                {/* Error */}
                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-4 text-sm border border-red-200">
                        {error}
                    </div>
                )}

                {/* Loading */}
                {loading && (
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-white rounded-xl border border-platinum p-4 animate-pulse">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-lg bg-platinum-light" />
                                    <div className="flex-1">
                                        <div className="h-4 bg-platinum-light rounded w-1/3 mb-2" />
                                        <div className="h-3 bg-platinum-light rounded w-1/4" />
                                    </div>
                                    <div className="h-5 bg-platinum-light rounded w-20" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Order List */}
                {!loading && filteredOrders.length > 0 && (
                    <div className="space-y-3">
                        <p className="text-sm text-platinum-dark">
                            {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''}
                            {statusFilter !== 'ALL' && ` · ${statusFilter}`}
                        </p>
                        <AnimatePresence mode="popLayout">
                            {filteredOrders.map((order, i) => {
                                const product = getProduct(order)
                                const escrow = getEscrow(order)
                                return (
                                    <motion.div
                                        key={order.id}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -8 }}
                                        transition={{ delay: i * 0.04 }}
                                        onClick={() => navigate(`/dashboard/order/${order.id}`)}
                                        className="bg-white rounded-xl border border-platinum p-4 flex items-center gap-4 cursor-pointer hover:border-gold/40 hover:shadow-sm transition-all"
                                    >
                                        {/* Thumbnail */}
                                        <div className="w-14 h-14 rounded-lg overflow-hidden bg-platinum-light flex-shrink-0">
                                            {product?.images?.[0] ? (
                                                <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="flex items-center justify-center h-full">
                                                    <Package className="w-6 h-6 text-platinum-dark" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-semibold text-navy text-sm truncate">
                                                    {product?.title || 'Order'}
                                                </span>
                                                <Badge variant={(STATUS_VARIANT[order.status] || 'default') as any}>
                                                    <span className="flex items-center gap-1">
                                                        {STATUS_ICON[order.status]}
                                                        {order.status}
                                                    </span>
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-platinum-dark">
                                                {new Date(order.created_at).toLocaleDateString()} · Qty: {order.quantity}
                                                {escrow && escrow.status === 'LOCKED' && (
                                                    <span className="ml-2 text-neoa-emerald">🔒 In Escrow</span>
                                                )}
                                            </p>
                                        </div>

                                        {/* Amount + Arrow */}
                                        <div className="text-right flex-shrink-0 flex items-center gap-2">
                                            <span className="font-bold text-navy">
                                                {formatCurrency(order.total_amount, order.currency || 'NGN')}
                                            </span>
                                            <ChevronRight className="w-4 h-4 text-platinum-dark" />
                                        </div>
                                    </motion.div>
                                )
                            })}
                        </AnimatePresence>

                        {/* Pagination */}
                        {pagination.pages > 1 && (
                            <div className="flex justify-center gap-2 pt-4">
                                {Array.from({ length: pagination.pages }, (_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => fetchBuyerOrders(i + 1)}
                                        className={`w-8 h-8 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
                                            pagination.page === i + 1
                                                ? 'bg-gold text-navy-dark'
                                                : 'bg-white text-platinum-dark border border-platinum hover:border-gold/40'
                                        }`}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Empty State */}
                {!loading && filteredOrders.length === 0 && (
                    <div className="bg-white rounded-2xl border border-platinum p-12 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-platinum-light flex items-center justify-center mx-auto mb-4">
                            <ShoppingBag className="w-8 h-8 text-platinum-dark" />
                        </div>
                        <h3 className="text-lg font-semibold text-navy font-[family-name:var(--font-heading)] mb-2">
                            {statusFilter === 'ALL' ? 'No orders yet' : `No ${statusFilter.toLowerCase()} orders`}
                        </h3>
                        <p className="text-platinum-dark text-sm max-w-sm mx-auto mb-6">
                            {statusFilter === 'ALL'
                                ? 'Start browsing our catalog to discover verified vendors and escrow-protected products.'
                                : 'Try a different filter or browse the catalog for new products.'}
                        </p>
                        {statusFilter === 'ALL' ? (
                            <button
                                onClick={() => navigate('/catalog')}
                                className="px-6 py-2.5 bg-gold text-navy-dark font-semibold rounded-full hover:bg-gold-light transition-colors cursor-pointer shadow-sm"
                            >
                                Browse Catalog →
                            </button>
                        ) : (
                            <button
                                onClick={() => setStatusFilter('ALL')}
                                className="px-6 py-2.5 bg-white text-navy font-semibold rounded-full border border-platinum hover:border-gold/40 transition-colors cursor-pointer"
                            >
                                Show All Orders
                            </button>
                        )}
                    </div>
                )}
            </motion.div>
        </AppShell>
    )
}
