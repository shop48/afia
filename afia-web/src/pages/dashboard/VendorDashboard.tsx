import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'
import AppShell from '../../components/layout/AppShell'
import { useNavigate } from 'react-router-dom'
import { Package, ShoppingBag, TrendingUp, AlertCircle } from 'lucide-react'
import { Badge } from '../../components/ui'
import { useProducts } from '../../hooks/useProducts'

export default function VendorDashboard() {
    const { profile, signOut } = useAuth()
    const navigate = useNavigate()
    const { products, fetchVendorProducts } = useProducts()

    const isVerified = profile?.kyc_level === 'VERIFIED'

    useEffect(() => {
        fetchVendorProducts()
    }, [fetchVendorProducts])

    return (
        <AppShell
            role="VENDOR"
            activePath="/vendor"
            userName={profile?.full_name || 'Vendor'}
            onNavigate={(path) => navigate(path)}
            onLogout={signOut}
        >
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
            >
                {/* Welcome Header */}
                <div className="flex items-start justify-between mb-8">
                    <div>
                        <h1 className="text-2xl lg:text-3xl font-bold text-navy font-[family-name:var(--font-heading)]">
                            Vendor Dashboard
                        </h1>
                        <p className="text-platinum-dark mt-1">Manage your products and orders</p>
                    </div>
                    <Badge variant={isVerified ? 'verified' : 'pending'}>
                        {isVerified ? 'Verified' : 'Unverified'}
                    </Badge>
                </div>

                {/* KYC Warning for unverified vendors */}
                {!isVerified && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-6 p-5 bg-gold/10 border border-gold/30 rounded-xl flex items-start gap-4"
                    >
                        <div className="w-10 h-10 rounded-lg bg-gold/20 flex items-center justify-center shrink-0">
                            <AlertCircle className="w-5 h-5 text-gold-dark" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-navy">Identity Verification Required</p>
                            <p className="text-xs text-platinum-dark mt-1 leading-relaxed">
                                Complete your SmileID verification to start listing products.
                                Unverified vendors cannot create product listings.
                            </p>
                            <button className="mt-3 px-4 py-2 text-xs font-bold bg-gold text-navy-dark rounded-full hover:bg-gold-light transition-colors cursor-pointer">
                                Start Verification →
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {[
                        { label: 'Products Listed', value: String(products.length), icon: <Package className="w-5 h-5" />, color: 'text-gold bg-gold/10' },
                        { label: 'Pending Orders', value: '0', icon: <ShoppingBag className="w-5 h-5" />, color: 'text-navy bg-navy/10' },
                        { label: 'Total Revenue', value: '₦0', icon: <TrendingUp className="w-5 h-5" />, color: 'text-neoa-emerald bg-neoa-emerald/10' },
                        { label: 'Pending Payouts', value: '₦0', icon: <TrendingUp className="w-5 h-5" />, color: 'text-gold-dark bg-gold/10' },
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

                {/* Empty State / Quick Actions */}
                {products.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-platinum p-12 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-platinum-light flex items-center justify-center mx-auto mb-4">
                            <Package className="w-8 h-8 text-platinum-dark" />
                        </div>
                        <h3 className="text-lg font-semibold text-navy font-[family-name:var(--font-heading)] mb-2">
                            No products listed yet
                        </h3>
                        <p className="text-platinum-dark text-sm max-w-sm mx-auto mb-6">
                            {isVerified
                                ? 'Create your first product listing to start selling globally with escrow protection.'
                                : 'Complete identity verification first, then you can start listing products.'}
                        </p>
                        {isVerified && (
                            <button
                                onClick={() => navigate('/vendor/products')}
                                className="px-6 py-2.5 bg-gold text-navy-dark font-semibold rounded-full hover:bg-gold-light transition-colors cursor-pointer shadow-sm"
                            >
                                Add Product →
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-platinum p-8">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-navy font-[family-name:var(--font-heading)]">
                                Quick Actions
                            </h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button
                                onClick={() => navigate('/vendor/products')}
                                className="p-4 rounded-xl border border-platinum text-left hover:bg-platinum-light/50 transition-colors cursor-pointer group"
                            >
                                <Package className="w-5 h-5 text-gold mb-2 group-hover:scale-110 transition-transform" />
                                <p className="font-semibold text-navy text-sm">Manage Products</p>
                                <p className="text-xs text-platinum-dark mt-0.5">{products.length} product{products.length !== 1 ? 's' : ''} listed</p>
                            </button>
                            <button
                                className="p-4 rounded-xl border border-platinum text-left hover:bg-platinum-light/50 transition-colors cursor-pointer group opacity-50"
                                disabled
                            >
                                <ShoppingBag className="w-5 h-5 text-navy mb-2" />
                                <p className="font-semibold text-navy text-sm">View Orders</p>
                                <p className="text-xs text-platinum-dark mt-0.5">Coming in Module 4</p>
                            </button>
                        </div>
                    </div>
                )}
            </motion.div>
        </AppShell>
    )
}

