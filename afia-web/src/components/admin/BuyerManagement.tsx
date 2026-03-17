import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { apiClient } from '../../lib/api'
import {
    Star, Shield, ShoppingBag, AlertTriangle, ChevronDown, ChevronUp,
    Loader2, X, CheckCircle, Search, RefreshCcw
} from 'lucide-react'
import { staggerContainer, staggerItem } from '../../lib/animations'

// ═══════════════════════════════════════════════
// BUYER MANAGEMENT — Admin Panel
// View all buyers, trust scores, order stats
// Flag/unflag buyers by adjusting scores
// ═══════════════════════════════════════════════

interface BuyerData {
    id: string
    full_name: string | null
    trust_score: number | null
    kyc_level: string
    kyc_method: string | null
    kyc_country: string | null
    created_at: string
    order_stats: {
        total: number
        completed: number
        disputed: number
    }
}

function getTrustBadge(score: number) {
    if (score <= 20) return { tier: 'Flagged', color: 'bg-red-100 text-red-700 border-red-200', ringColor: 'stroke-red-500' }
    if (score <= 50) return { tier: 'Normal', color: 'bg-gray-100 text-gray-600 border-gray-200', ringColor: 'stroke-gray-400' }
    if (score <= 80) return { tier: 'Trusted', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', ringColor: 'stroke-emerald-500' }
    return { tier: 'Premium', color: 'bg-amber-100 text-amber-700 border-amber-200', ringColor: 'stroke-gold' }
}

export default function BuyerManagement() {
    const [buyers, setBuyers] = useState<BuyerData[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [adjusting, setAdjusting] = useState<string | null>(null)
    const [scoreInputs, setScoreInputs] = useState<Record<string, string>>({})

    const fetchBuyers = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const data = await apiClient<{ buyers: BuyerData[] }>('/api/admin/buyers')
            setBuyers(data.buyers || [])
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load buyers')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchBuyers() }, [fetchBuyers])

    // Filter by search
    const filtered = buyers.filter(b => {
        if (!searchQuery) return true
        const q = searchQuery.toLowerCase()
        return (b.full_name || '').toLowerCase().includes(q) || b.id.includes(q)
    })

    // Stats
    const flaggedCount = buyers.filter(b => (b.trust_score ?? 50) <= 20).length
    const totalBuyers = buyers.length
    const avgScore = totalBuyers > 0
        ? Math.round(buyers.reduce((sum, b) => sum + (b.trust_score ?? 50), 0) / totalBuyers)
        : 0

    // Adjust trust score
    const handleAdjustScore = async (buyerId: string) => {
        const rawScore = scoreInputs[buyerId]
        const score = parseInt(rawScore, 10)
        if (isNaN(score) || score < 0 || score > 100) {
            setError('Score must be between 0 and 100')
            return
        }

        setAdjusting(buyerId)
        try {
            await apiClient(`/api/admin/buyers/${buyerId}/trust-score`, {
                method: 'POST',
                body: JSON.stringify({ score }),
            })

            // Update local state
            setBuyers(prev => prev.map(b =>
                b.id === buyerId ? { ...b, trust_score: score } : b
            ))
            setScoreInputs(prev => { const next = { ...prev }; delete next[buyerId]; return next })
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update trust score')
        } finally {
            setAdjusting(null)
        }
    }

    // Loading
    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-gold animate-spin" />
            </div>
        )
    }

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-navy font-[family-name:var(--font-heading)]">
                        Buyer Management
                    </h1>
                    <p className="text-platinum-dark mt-1">Monitor trust scores and buyer behavior</p>
                </div>
                <button
                    onClick={fetchBuyers}
                    className="flex items-center gap-2 px-4 py-2 text-sm border border-platinum rounded-xl text-navy hover:bg-platinum-light transition-colors cursor-pointer"
                >
                    <RefreshCcw className="w-4 h-4" /> Refresh
                </button>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-50 text-red-600 border border-red-200 px-4 py-3 rounded-xl mb-6 text-sm flex items-center justify-between">
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 cursor-pointer"><X size={16} /></button>
                </div>
            )}

            {/* Stats Row */}
            <motion.div
                variants={staggerContainer}
                initial="initial"
                animate="animate"
                className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"
            >
                <motion.div variants={staggerItem} className="bg-white rounded-xl border border-platinum p-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-navy/10 flex items-center justify-center">
                            <ShoppingBag className="w-5 h-5 text-navy" />
                        </div>
                        <div>
                            <p className="text-xs text-platinum-dark font-medium">Total Buyers</p>
                            <p className="text-xl font-bold text-navy">{totalBuyers}</p>
                        </div>
                    </div>
                </motion.div>

                <motion.div variants={staggerItem} className="bg-white rounded-xl border border-platinum p-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center">
                            <Star className="w-5 h-5 text-gold" />
                        </div>
                        <div>
                            <p className="text-xs text-platinum-dark font-medium">Average Score</p>
                            <p className="text-xl font-bold text-navy">{avgScore}</p>
                        </div>
                    </div>
                </motion.div>

                <motion.div variants={staggerItem} className="bg-white rounded-xl border border-platinum p-5">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${flaggedCount > 0 ? 'bg-red-100' : 'bg-emerald-100'}`}>
                            {flaggedCount > 0
                                ? <AlertTriangle className="w-5 h-5 text-red-500" />
                                : <Shield className="w-5 h-5 text-emerald-600" />}
                        </div>
                        <div>
                            <p className="text-xs text-platinum-dark font-medium">Flagged Accounts</p>
                            <p className={`text-xl font-bold ${flaggedCount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{flaggedCount}</p>
                        </div>
                    </div>
                </motion.div>
            </motion.div>

            {/* Search */}
            <div className="relative mb-6">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-platinum-dark" />
                <input
                    type="text"
                    placeholder="Search by name or ID..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-platinum rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
                />
            </div>

            {/* Buyers List */}
            {filtered.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-platinum">
                    <ShoppingBag className="w-12 h-12 text-platinum-dark mx-auto mb-3" />
                    <p className="text-platinum-dark">No buyers found</p>
                </div>
            ) : (
                <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-3">
                    {filtered.map(buyer => {
                        const score = buyer.trust_score ?? 50
                        const badge = getTrustBadge(score)
                        const isExpanded = expandedId === buyer.id

                        return (
                            <motion.div
                                key={buyer.id}
                                variants={staggerItem}
                                className="bg-white rounded-xl border border-platinum overflow-hidden hover:shadow-sm transition-shadow"
                            >
                                {/* Card header */}
                                <button
                                    onClick={() => setExpandedId(isExpanded ? null : buyer.id)}
                                    className="w-full p-4 text-left cursor-pointer flex items-center justify-between gap-4 bg-transparent border-none"
                                >
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        {/* Avatar */}
                                        <div className="w-10 h-10 rounded-full bg-navy/10 flex items-center justify-center text-navy font-bold text-sm shrink-0">
                                            {buyer.full_name?.[0]?.toUpperCase() || '?'}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-sm font-semibold text-navy truncate">
                                                    {buyer.full_name || 'Unknown'}
                                                </span>
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full border ${badge.color}`}>
                                                    ⭐ {score} · {badge.tier}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-platinum-dark mt-0.5">
                                                {buyer.order_stats.total} orders · {buyer.order_stats.completed} completed · {buyer.order_stats.disputed} disputed
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        {/* Mini ring */}
                                        <svg width="32" height="32" viewBox="0 0 36 36" className="-rotate-90">
                                            <circle cx="18" cy="18" r="14" fill="none" strokeWidth="3" className="stroke-platinum-light" />
                                            <circle cx="18" cy="18" r="14" fill="none" strokeWidth="3" className={badge.ringColor}
                                                strokeDasharray={`${score * 0.88} 88`}
                                                strokeLinecap="round" />
                                        </svg>
                                        {isExpanded ? <ChevronUp className="w-4 h-4 text-platinum-dark" /> : <ChevronDown className="w-4 h-4 text-platinum-dark" />}
                                    </div>
                                </button>

                                {/* Expanded details */}
                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="px-4 pb-4 border-t border-platinum pt-3 space-y-4">
                                                {/* Details grid */}
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                    <div className="bg-platinum-light rounded-lg p-3">
                                                        <p className="text-[10px] text-platinum-dark uppercase font-semibold">Trust Score</p>
                                                        <p className="text-lg font-bold text-navy">{score}/100</p>
                                                    </div>
                                                    <div className="bg-platinum-light rounded-lg p-3">
                                                        <p className="text-[10px] text-platinum-dark uppercase font-semibold">KYC</p>
                                                        <p className="text-sm font-bold text-navy">{buyer.kyc_level || 'NONE'}</p>
                                                    </div>
                                                    <div className="bg-platinum-light rounded-lg p-3">
                                                        <p className="text-[10px] text-platinum-dark uppercase font-semibold">Joined</p>
                                                        <p className="text-sm font-medium text-navy">{new Date(buyer.created_at).toLocaleDateString()}</p>
                                                    </div>
                                                    <div className="bg-platinum-light rounded-lg p-3">
                                                        <p className="text-[10px] text-platinum-dark uppercase font-semibold">ID</p>
                                                        <p className="text-xs font-mono text-navy truncate">{buyer.id.slice(0, 12)}...</p>
                                                    </div>
                                                </div>

                                                {/* Adjust trust score */}
                                                <div className="bg-platinum-light rounded-xl p-4">
                                                    <label className="text-xs font-semibold text-navy uppercase tracking-wider block mb-2">
                                                        Adjust Trust Score
                                                    </label>
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            max={100}
                                                            placeholder={`Current: ${score}`}
                                                            value={scoreInputs[buyer.id] ?? ''}
                                                            onChange={e => setScoreInputs(prev => ({ ...prev, [buyer.id]: e.target.value }))}
                                                            className="flex-1 px-3 py-2 text-sm border border-platinum rounded-lg outline-none focus:border-gold transition-colors"
                                                        />
                                                        <button
                                                            onClick={() => handleAdjustScore(buyer.id)}
                                                            disabled={!scoreInputs[buyer.id] || adjusting === buyer.id}
                                                            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-gold text-navy-dark rounded-lg hover:bg-gold-light transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            {adjusting === buyer.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                                                            Apply
                                                        </button>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                                        {[
                                                            { label: 'Flag (10)', value: '10', cls: 'bg-red-100 text-red-700 hover:bg-red-200' },
                                                            { label: 'Reset (50)', value: '50', cls: 'bg-gray-100 text-gray-700 hover:bg-gray-200' },
                                                            { label: 'Trusted (75)', value: '75', cls: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' },
                                                            { label: 'Premium (95)', value: '95', cls: 'bg-amber-100 text-amber-700 hover:bg-amber-200' },
                                                        ].map(preset => (
                                                            <button
                                                                key={preset.value}
                                                                onClick={() => setScoreInputs(prev => ({ ...prev, [buyer.id]: preset.value }))}
                                                                className={`px-2 py-1 text-[10px] font-bold rounded-full cursor-pointer transition-colors ${preset.cls}`}
                                                            >
                                                                {preset.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <p className="text-[10px] text-platinum-dark mt-2">
                                                        ⚠️ Setting score ≤ 20 will block this buyer from making purchases. This action is logged in the audit trail.
                                                    </p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        )
                    })}
                </motion.div>
            )}
        </div>
    )
}
