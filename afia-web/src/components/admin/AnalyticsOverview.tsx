import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
    DollarSign, TrendingUp, AlertTriangle, Package,
    Users, Clock, Shield, ArrowUpRight,
} from 'lucide-react'
import { apiClient } from '../../lib/api'

// ═══════════════════════════════════════════════
// MODULE 7.3: ANALYTICS OVERVIEW (LIGHT THEME)
// Platform metrics dashboard
// ═══════════════════════════════════════════════

interface AnalyticsData {
    total_escrowed: number
    total_released_week: number
    active_orders: number
    dispute_rate: number
    total_orders: number
    disputed_orders: number
    total_vendors: number
    pending_payouts: number
}

const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.1, duration: 0.4, ease: [0, 0, 0.2, 1] as const },
    }),
}

export default function AnalyticsOverview() {
    const [data, setData] = useState<AnalyticsData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchAnalytics = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const result = await apiClient<AnalyticsData>('/api/admin/analytics')
            setData(result)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load analytics')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchAnalytics() }, [fetchAnalytics])

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(amount)

    if (loading) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                    <div key={i} className="animate-pulse bg-platinum-light rounded-2xl h-32 border border-platinum" />
                ))}
            </div>
        )
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-4 text-sm">
                {error}
                <button onClick={fetchAnalytics} className="ml-2 underline cursor-pointer">Retry</button>
            </div>
        )
    }

    if (!data) return null

    const metrics = [
        {
            label: 'Total Escrowed',
            value: formatCurrency(data.total_escrowed),
            icon: DollarSign,
            gradient: 'from-gold/10 to-gold/5',
            border: 'border-gold/20',
            iconBg: 'bg-gold/10',
            iconColor: 'text-gold',
            description: 'Currently locked in vault',
        },
        {
            label: 'Released This Week',
            value: formatCurrency(data.total_released_week),
            icon: TrendingUp,
            gradient: 'from-emerald-50 to-emerald-50/50',
            border: 'border-emerald-200',
            iconBg: 'bg-emerald-100',
            iconColor: 'text-emerald-600',
            description: 'Funds released to vendors',
        },
        {
            label: 'Active Orders',
            value: data.active_orders.toLocaleString(),
            icon: Package,
            gradient: 'from-blue-50 to-blue-50/50',
            border: 'border-blue-200',
            iconBg: 'bg-blue-100',
            iconColor: 'text-blue-600',
            description: 'In-flight transactions',
        },
        {
            label: 'Dispute Rate',
            value: `${data.dispute_rate}%`,
            icon: AlertTriangle,
            gradient: data.dispute_rate > 10
                ? 'from-red-50 to-red-50/50'
                : 'from-amber-50 to-amber-50/50',
            border: data.dispute_rate > 10 ? 'border-red-200' : 'border-amber-200',
            iconBg: data.dispute_rate > 10 ? 'bg-red-100' : 'bg-amber-100',
            iconColor: data.dispute_rate > 10 ? 'text-red-600' : 'text-amber-600',
            description: `${data.disputed_orders} of ${data.total_orders} orders`,
        },
        {
            label: 'Total Vendors',
            value: data.total_vendors.toLocaleString(),
            icon: Users,
            gradient: 'from-purple-50 to-purple-50/50',
            border: 'border-purple-200',
            iconBg: 'bg-purple-100',
            iconColor: 'text-purple-600',
            description: 'Registered sellers',
        },
        {
            label: 'Total Orders',
            value: data.total_orders.toLocaleString(),
            icon: Shield,
            gradient: 'from-cyan-50 to-cyan-50/50',
            border: 'border-cyan-200',
            iconBg: 'bg-cyan-100',
            iconColor: 'text-cyan-600',
            description: 'Lifetime transactions',
        },
        {
            label: 'Pending Payouts',
            value: data.pending_payouts.toLocaleString(),
            icon: Clock,
            gradient: 'from-orange-50 to-orange-50/50',
            border: 'border-orange-200',
            iconBg: 'bg-orange-100',
            iconColor: 'text-orange-600',
            description: 'Awaiting Friday batch',
        },
        {
            label: 'Disputed Orders',
            value: data.disputed_orders.toLocaleString(),
            icon: AlertTriangle,
            gradient: 'from-rose-50 to-rose-50/50',
            border: 'border-rose-200',
            iconBg: 'bg-rose-100',
            iconColor: 'text-rose-600',
            description: 'Need arbitration',
        },
    ]

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-navy font-[family-name:var(--font-heading)]">
                    Analytics Overview
                </h2>
                <p className="text-sm text-platinum-dark mt-1">
                    Platform-wide metrics at a glance
                </p>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {metrics.map((metric, i) => (
                    <motion.div
                        key={metric.label}
                        custom={i}
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                        className={`bg-gradient-to-br ${metric.gradient} border ${metric.border} 
              rounded-2xl p-5 hover:scale-[1.02] hover:shadow-md transition-all cursor-default`}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div className={`w-10 h-10 rounded-xl ${metric.iconBg} flex items-center justify-center`}>
                                <metric.icon className={`w-5 h-5 ${metric.iconColor}`} />
                            </div>
                            <ArrowUpRight className="w-4 h-4 text-platinum-dark/40" />
                        </div>
                        <p className="text-2xl font-bold text-navy mb-1">{metric.value}</p>
                        <p className="text-xs font-medium text-platinum-dark uppercase tracking-wider">{metric.label}</p>
                        <p className="text-xs text-platinum-dark mt-1">{metric.description}</p>
                    </motion.div>
                ))}
            </div>
        </div>
    )
}
