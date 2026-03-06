import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'
import AppShell from '../../components/layout/AppShell'
import { useNavigate } from 'react-router-dom'
import { ShoppingBag, Package, Shield, TrendingUp, ChevronRight, Clock, Truck, CheckCircle, AlertTriangle } from 'lucide-react'
import { Badge } from '../../components/ui'
import { useOrders, getProduct, getEscrow, type Order } from '../../hooks/useOrders'

const STATUS_VARIANT: Record<string, string> = {
    PAID: 'pending',
    SHIPPED: 'locked',
    DELIVERED: 'verified',
    COMPLETED: 'released',
    DISPUTED: 'disputed',
}

const STATUS_ICON: Record<string, React.ReactNode> = {
    PAID: <Clock className="w-3.5 h-3.5" />,
    SHIPPED: <Truck className="w-3.5 h-3.5" />,
    DELIVERED: <CheckCircle className="w-3.5 h-3.5" />,
    COMPLETED: <CheckCircle className="w-3.5 h-3.5" />,
    DISPUTED: <AlertTriangle className="w-3.5 h-3.5" />,
}

function computeStats(orders: Order[]) {
    let activeOrders = 0
    let delivered = 0
    let inEscrow = 0
    let totalSpent = 0

    for (const o of orders) {
        if (['PAID', 'SHIPPED'].includes(o.status)) activeOrders++
        if (['DELIVERED', 'COMPLETED'].includes(o.status)) delivered++

        const escrow = getEscrow(o)
        if (escrow && escrow.status === 'LOCKED') {
            inEscrow += escrow.gross_amount
        }
        if (o.status === 'COMPLETED') {
            totalSpent += o.total_amount
        }
    }

    return { activeOrders, delivered, inEscrow, totalSpent }
}

export default function BuyerDashboard() {
    const { profile, signOut } = useAuth()
    const navigate = useNavigate()
    const { orders, loading, error, fetchBuyerOrders } = useOrders()

    useEffect(() => {
        fetchBuyerOrders()
    }, [fetchBuyerOrders])

    const stats = computeStats(orders)

    return (
        <AppShell
            role="BUYER"
            activePath="/dashboard"
            userName={profile?.full_name || 'Buyer'}
            onNavigate={(path) => navigate(path)}
            onLogout={signOut}
        >
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
            >
                {/* Welcome Header */}
                <div className="mb-8">
                    <h1 className="text-2xl lg:text-3xl font-bold text-navy font-[family-name:var(--font-heading)]">
                        Welcome back, <span className="text-gold">{profile?.full_name?.split(' ')[0] || 'User'}</span>
                    </h1>
                    <p className="text-platinum-dark mt-1">Here's your buying activity at a glance</p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {[
                        { label: 'Active Orders', value: String(stats.activeOrders), icon: <ShoppingBag className="w-5 h-5" />, color: 'text-gold bg-gold/10' },
                        { label: 'Delivered', value: String(stats.delivered), icon: <Package className="w-5 h-5" />, color: 'text-neoa-emerald bg-neoa-emerald/10' },
                        { label: 'In Escrow', value: `₦${stats.inEscrow.toLocaleString()}`, icon: <Shield className="w-5 h-5" />, color: 'text-navy bg-navy/10' },
                        { label: 'Total Spent', value: `₦${stats.totalSpent.toLocaleString()}`, icon: <TrendingUp className="w-5 h-5" />, color: 'text-gold-dark bg-gold/10' },
                    ].map((stat, i) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.08 }}
                            className="bg-white rounded-xl border border-platinum p-5"
                        >
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${stat.color}`}>
                                {stat.icon}
                            </div>
                            <p className="text-2xl font-bold text-navy">{stat.value}</p>
                            <p className="text-xs text-platinum-dark mt-0.5">{stat.label}</p>
                        </motion.div>
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
                    <div className="text-center py-12 text-platinum-dark">
                        Loading your orders...
                    </div>
                )}

                {/* Order List */}
                {!loading && orders.length > 0 && (
                    <div className="space-y-3">
                        <h2 className="text-lg font-semibold text-navy font-[family-name:var(--font-heading)]">
                            Your Orders
                        </h2>
                        <AnimatePresence mode="popLayout">
                            {orders.map((order, i) => {
                                const product = getProduct(order)
                                return (
                                    <motion.div
                                        key={order.id}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
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
                                            </p>
                                        </div>

                                        {/* Amount + Arrow */}
                                        <div className="text-right flex-shrink-0 flex items-center gap-2">
                                            <span className="font-bold text-navy">
                                                {order.currency} {order.total_amount.toLocaleString()}
                                            </span>
                                            <ChevronRight className="w-4 h-4 text-platinum-dark" />
                                        </div>
                                    </motion.div>
                                )
                            })}
                        </AnimatePresence>
                    </div>
                )}

                {/* Empty State */}
                {!loading && orders.length === 0 && (
                    <div className="bg-white rounded-2xl border border-platinum p-12 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-platinum-light flex items-center justify-center mx-auto mb-4">
                            <ShoppingBag className="w-8 h-8 text-platinum-dark" />
                        </div>
                        <h3 className="text-lg font-semibold text-navy font-[family-name:var(--font-heading)] mb-2">
                            No orders yet
                        </h3>
                        <p className="text-platinum-dark text-sm max-w-sm mx-auto mb-6">
                            Start browsing our catalog to discover verified vendors and escrow-protected products.
                        </p>
                        <button
                            onClick={() => navigate('/catalog')}
                            className="px-6 py-2.5 bg-gold text-navy-dark font-semibold rounded-full hover:bg-gold-light transition-colors cursor-pointer shadow-sm"
                        >
                            Browse Catalog →
                        </button>
                    </div>
                )}
            </motion.div>
        </AppShell>
    )
}
