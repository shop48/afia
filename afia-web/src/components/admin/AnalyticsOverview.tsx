import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
    DollarSign, TrendingUp, AlertTriangle, Package,
    Users, Clock, Shield, ArrowUpRight,
} from 'lucide-react'
import { apiClient } from '../../lib/api'

// ═══════════════════════════════════════════════
// MODULE 7.3: ANALYTICS OVERVIEW
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
                    <div key={i} className="animate-pulse bg-white/5 rounded-2xl h-32 border border-white/10" />
                ))}
            </div>
        )
    }

    if (error) {
        return (
            <div className="bg-ruby/10 border border-ruby/30 text-ruby rounded-xl p-4 text-sm">
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
            color: 'gold',
            gradient: 'from-gold/15 to-gold/5',
            border: 'border-gold/20',
            iconColor: 'text-gold',
            description: 'Currently locked in vault',
        },
        {
            label: 'Released This Week',
            value: formatCurrency(data.total_released_week),
            icon: TrendingUp,
            color: 'emerald',
            gradient: 'from-emerald-500/15 to-emerald-500/5',
            border: 'border-emerald-500/20',
            iconColor: 'text-emerald-400',
            description: 'Funds released to vendors',
        },
        {
            label: 'Active Orders',
            value: data.active_orders.toLocaleString(),
            icon: Package,
            color: 'blue',
            gradient: 'from-blue-500/15 to-blue-500/5',
            border: 'border-blue-500/20',
            iconColor: 'text-blue-400',
            description: 'In-flight transactions',
        },
        {
            label: 'Dispute Rate',
            value: `${data.dispute_rate}%`,
            icon: AlertTriangle,
            color: data.dispute_rate > 10 ? 'ruby' : 'amber',
            gradient: data.dispute_rate > 10
                ? 'from-ruby/15 to-ruby/5'
                : 'from-amber-500/15 to-amber-500/5',
            border: data.dispute_rate > 10 ? 'border-ruby/20' : 'border-amber-500/20',
            iconColor: data.dispute_rate > 10 ? 'text-ruby' : 'text-amber-400',
            description: `${data.disputed_orders} of ${data.total_orders} orders`,
        },
        {
            label: 'Total Vendors',
            value: data.total_vendors.toLocaleString(),
            icon: Users,
            color: 'purple',
            gradient: 'from-purple-500/15 to-purple-500/5',
            border: 'border-purple-500/20',
            iconColor: 'text-purple-400',
            description: 'Registered sellers',
        },
        {
            label: 'Total Orders',
            value: data.total_orders.toLocaleString(),
            icon: Shield,
            color: 'cyan',
            gradient: 'from-cyan-500/15 to-cyan-500/5',
            border: 'border-cyan-500/20',
            iconColor: 'text-cyan-400',
            description: 'Lifetime transactions',
        },
        {
            label: 'Pending Payouts',
            value: data.pending_payouts.toLocaleString(),
            icon: Clock,
            color: 'orange',
            gradient: 'from-orange-500/15 to-orange-500/5',
            border: 'border-orange-500/20',
            iconColor: 'text-orange-400',
            description: 'Awaiting Friday batch',
        },
        {
            label: 'Disputed Orders',
            value: data.disputed_orders.toLocaleString(),
            icon: AlertTriangle,
            color: 'rose',
            gradient: 'from-rose-500/15 to-rose-500/5',
            border: 'border-rose-500/20',
            iconColor: 'text-rose-400',
            description: 'Need arbitration',
        },
    ]

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-gold font-[family-name:var(--font-heading)]">
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
              rounded-2xl p-5 hover:scale-[1.02] transition-transform cursor-default`}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center`}>
                                <metric.icon className={`w-5 h-5 ${metric.iconColor}`} />
                            </div>
                            <ArrowUpRight className="w-4 h-4 text-white/20" />
                        </div>
                        <p className="text-2xl font-bold text-white mb-1">{metric.value}</p>
                        <p className="text-xs font-medium text-platinum uppercase tracking-wider">{metric.label}</p>
                        <p className="text-xs text-platinum-dark mt-1">{metric.description}</p>
                    </motion.div>
                ))}
            </div>
        </div>
    )
}
