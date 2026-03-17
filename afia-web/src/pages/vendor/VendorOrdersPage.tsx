import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'
import AppShell from '../../components/layout/AppShell'
import { useNavigate } from 'react-router-dom'
import { Package, Truck, CheckCircle, Clock, AlertTriangle } from 'lucide-react'
import { Badge } from '../../components/ui'
import { useOrders, getProduct, getEscrow, getBuyer, type Order } from '../../hooks/useOrders'
import FulfillmentModal from '../../components/logistics/FulfillmentModal'
import { formatCurrency } from '../../lib/currency'

const STATUS_TABS = [
    { key: '', label: 'All Orders' },
    { key: 'PAID', label: 'Awaiting Fulfillment' },
    { key: 'SHIPPED', label: 'Shipped' },
    { key: 'DELIVERED', label: 'Delivered' },
    { key: 'COMPLETED', label: 'Completed' },
]

const STATUS_BADGE_VARIANT: Record<string, string> = {
    PAID: 'pending',
    SHIPPED: 'locked',
    DELIVERED: 'verified',
    COMPLETED: 'released',
    DISPUTED: 'disputed',
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
    PAID: <Clock size={14} />,
    SHIPPED: <Truck size={14} />,
    DELIVERED: <CheckCircle size={14} />,
    COMPLETED: <CheckCircle size={14} />,
    DISPUTED: <AlertTriangle size={14} />,
}

export default function VendorOrdersPage() {
    const { profile, signOut } = useAuth()
    const navigate = useNavigate()
    const { orders, loading, error, pagination, fetchVendorOrders, fulfillOrder } = useOrders()

    const [activeTab, setActiveTab] = useState('')
    const [fulfillTarget, setFulfillTarget] = useState<Order | null>(null)

    useEffect(() => {
        fetchVendorOrders(activeTab || undefined)
    }, [activeTab, fetchVendorOrders])

    const handleFulfill = async (orderId: string, rail: 'rail1' | 'rail2', data: Record<string, string>) => {
        await fulfillOrder(orderId, rail, data)
        // Refresh the list
        fetchVendorOrders(activeTab || undefined)
    }

    return (
        <AppShell
            role="VENDOR"
            activePath="/vendor/orders"
            userName={profile?.full_name || 'Vendor'}
            onNavigate={(path) => navigate(path)}
            onLogout={signOut}
        >
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="max-w-4xl mx-auto"
            >
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-navy font-[family-name:var(--font-heading)] m-0">
                        <Package className="w-5 h-5 inline-block mr-1.5 -mt-0.5" /> Order Management
                    </h1>
                    <p className="text-platinum-dark text-sm mt-1 mb-0">
                        Fulfill orders, track shipments, and manage deliveries
                    </p>
                </div>

                {/* Status Tabs */}
                <div className="flex gap-2 mb-5 flex-wrap border-b border-platinum pb-3">
                    {STATUS_TABS.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`px-4 py-2 rounded-lg border-none text-sm cursor-pointer transition-all ${activeTab === tab.key
                                ? 'bg-gold/15 text-gold font-semibold'
                                : 'bg-platinum-light text-platinum-dark hover:bg-platinum'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Error State */}
                {error && (
                    <div className="bg-red-50 text-red-600 border border-red-200 px-4 py-3 rounded-xl mb-4 text-sm">
                        {error}
                    </div>
                )}

                {/* Loading */}
                {loading && (
                    <div className="text-center py-12 text-platinum-dark">
                        Loading orders...
                    </div>
                )}

                {/* Empty State */}
                {!loading && orders.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-12 px-6 bg-white rounded-xl border border-platinum"
                    >
                        <Package size={48} className="text-platinum-dark mx-auto" />
                        <h3 className="text-platinum-dark mt-4 font-medium text-lg">
                            {activeTab ? `No ${activeTab.toLowerCase()} orders` : 'No orders yet'}
                        </h3>
                        <p className="text-platinum-dark text-sm">
                            Orders from buyers will appear here. Make sure your products are published!
                        </p>
                    </motion.div>
                )}

                {/* Order Cards */}
                <AnimatePresence mode="popLayout">
                    {orders.map((order, i) => {
                        const product = getProduct(order)
                        const escrow = getEscrow(order)
                        const buyer = getBuyer(order)

                        return (
                            <motion.div
                                key={order.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ delay: i * 0.04 }}
                                className="bg-white border border-platinum rounded-xl p-4 mb-3 flex items-center gap-4 cursor-pointer hover:border-gold/30 hover:shadow-sm transition-all"
                            >
                                {/* Product Thumbnail */}
                                <div className="w-14 h-14 rounded-lg overflow-hidden bg-platinum-light flex-shrink-0">
                                    {product?.images?.[0] ? (
                                        <img
                                            src={product.images[0]}
                                            alt={product.title}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center h-full">
                                            <Package size={24} className="text-platinum-dark" />
                                        </div>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-semibold text-navy text-sm truncate">
                                            {product?.title || 'Unknown Product'}
                                        </span>
                                        <Badge
                                            variant={(STATUS_BADGE_VARIANT[order.status] || 'default') as any}
                                        >
                                            <span className="flex items-center gap-1">
                                                {STATUS_ICONS[order.status]}
                                                {order.status}
                                            </span>
                                        </Badge>
                                    </div>
                                    <div className="flex gap-4 text-xs text-platinum-dark">
                                        <span>Buyer: {buyer?.full_name || 'Anonymous'}</span>
                                        <span>Qty: {order.quantity}</span>
                                        <span>{new Date(order.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>

                                {/* Amount + Action */}
                                <div className="text-right flex-shrink-0">
                                    <div className="font-bold text-navy text-base">
                                        {formatCurrency(
                                            (escrow as any)?.net_payout || order.total_amount,
                                            order.currency || 'NGN'
                                        )}
                                    </div>
                                    {order.status === 'PAID' && (
                                        <button
                                            onClick={e => {
                                                e.stopPropagation()
                                                setFulfillTarget(order)
                                            }}
                                            className="mt-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-gold to-gold-dark text-white text-xs font-semibold cursor-pointer border-none hover:-translate-y-0.5 transition-transform"
                                        >
                                            Fulfill Order
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        )
                    })}
                </AnimatePresence>

                {/* Pagination */}
                {pagination.pages > 1 && (
                    <div className="flex justify-center gap-2 mt-5 pt-4 border-t border-platinum">
                        {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(p => (
                            <button
                                key={p}
                                onClick={() => fetchVendorOrders(activeTab || undefined, p)}
                                className={`w-9 h-9 rounded-lg border-none cursor-pointer text-sm transition-colors ${p === pagination.page
                                    ? 'bg-gold text-white font-bold'
                                    : 'bg-platinum-light text-platinum-dark hover:bg-platinum'
                                    }`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                )}
            </motion.div>

            {/* Fulfillment Modal */}
            {fulfillTarget && (
                <FulfillmentModal
                    orderId={fulfillTarget.id}
                    productTitle={getProduct(fulfillTarget)?.title || 'Order'}
                    isOpen={!!fulfillTarget}
                    onClose={() => setFulfillTarget(null)}
                    onSubmit={handleFulfill}
                />
            )}
        </AppShell>
    )
}
