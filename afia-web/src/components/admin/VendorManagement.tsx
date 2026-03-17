import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Users, Flag, ShieldCheck, ShieldAlert, AlertTriangle,
    Search, ToggleLeft, ToggleRight, Package,
    DollarSign, TrendingDown, Clock,
} from 'lucide-react'
import { apiClient } from '../../lib/api'

// ═══════════════════════════════════════════════
// MODULE 7.2: VENDOR MANAGEMENT (LIGHT THEME)
// Flag, KYC Velocity Alerts, Treasury Toggle
// ═══════════════════════════════════════════════

interface Vendor {
    id: string
    full_name: string | null
    email: string
    role: string
    kyc_level: string
    is_flagged: boolean
    flag_reason: string | null
    flagged_at: string | null
    treasury_mode: 'AUTO' | 'MANUAL_HOLD'
    settlement_currency: string
    created_at: string
    total_orders: number
    disputed_orders: number
    dispute_rate: number
    total_escrowed: number
    kyc_velocity_alert: boolean
}

export default function VendorManagement() {
    const [vendors, setVendors] = useState<Vendor[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [flagModal, setFlagModal] = useState<{ vendor: Vendor; action: 'FLAG' | 'UNFLAG' } | null>(null)
    const [flagReason, setFlagReason] = useState('')
    const [flagLoading, setFlagLoading] = useState(false)
    const [treasuryLoading, setTreasuryLoading] = useState<string | null>(null)

    const fetchVendors = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const data = await apiClient<{ vendors: Vendor[] }>('/api/admin/vendors')
            setVendors(data.vendors || [])
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load vendors')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchVendors() }, [fetchVendors])

    // Filter vendors
    const filtered = vendors.filter(v => {
        const q = searchQuery.toLowerCase()
        return (
            !q ||
            (v.full_name && v.full_name.toLowerCase().includes(q)) ||
            v.email.toLowerCase().includes(q)
        )
    })

    // Flag/Unflag vendor
    const handleFlag = async () => {
        if (!flagModal) return
        setFlagLoading(true)
        try {
            await apiClient(`/api/admin/vendors/${flagModal.vendor.id}/flag`, {
                method: 'POST',
                body: JSON.stringify({
                    action: flagModal.action,
                    reason: flagReason.trim() || undefined,
                }),
            })
            setFlagModal(null)
            setFlagReason('')
            fetchVendors()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Flag operation failed')
        } finally {
            setFlagLoading(false)
        }
    }

    // Treasury toggle
    const handleTreasuryToggle = async (vendor: Vendor) => {
        const newMode = vendor.treasury_mode === 'AUTO' ? 'MANUAL_HOLD' : 'AUTO'
        setTreasuryLoading(vendor.id)
        try {
            await apiClient(`/api/admin/vendors/${vendor.id}/treasury-toggle`, {
                method: 'POST',
                body: JSON.stringify({ mode: newMode }),
            })
            fetchVendors()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Treasury toggle failed')
        } finally {
            setTreasuryLoading(null)
        }
    }

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount)

    if (loading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse bg-platinum-light rounded-2xl h-24 border border-platinum" />
                ))}
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-navy font-[family-name:var(--font-heading)]">
                        Vendor Management
                    </h2>
                    <p className="text-sm text-platinum-dark mt-1">
                        {vendors.length} registered vendor{vendors.length !== 1 ? 's' : ''}
                    </p>
                </div>
            </div>

            {/* KYC Velocity Alerts Banner */}
            {vendors.some(v => v.kyc_velocity_alert) && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-50 border border-red-200 rounded-2xl p-4"
                >
                    <div className="flex items-center gap-2 text-red-600 font-bold mb-2">
                        <AlertTriangle className="w-5 h-5" />
                        KYC Velocity Alert
                    </div>
                    <p className="text-sm text-red-600/80">
                        {vendors.filter(v => v.kyc_velocity_alert).length} vendor(s) exceeded $500 in their first 48 hours
                        — potential Sybil attack indicator. Review flagged vendors below.
                    </p>
                </motion.div>
            )}

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-platinum-dark" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search vendors by name or email..."
                    className="w-full pl-11 pr-4 py-3 bg-white border border-platinum rounded-xl text-navy 
            placeholder:text-platinum-dark focus:outline-none focus:border-gold/50 focus:ring-2 focus:ring-gold/10 transition-all"
                />
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-4 text-sm">
                    {error}
                    <button onClick={() => setError(null)} className="ml-2 underline cursor-pointer">Dismiss</button>
                </div>
            )}

            {/* Vendor Cards */}
            <div className="space-y-3">
                {filtered.length === 0 ? (
                    <div className="text-center py-16">
                        <Users className="w-12 h-12 text-platinum-dark mx-auto mb-4" />
                        <p className="text-platinum-dark">
                            {searchQuery ? 'No vendors match your search.' : 'No vendors registered yet.'}
                        </p>
                    </div>
                ) : (
                    filtered.map((vendor) => (
                        <motion.div
                            key={vendor.id}
                            layout
                            className={`bg-white border rounded-2xl p-5 transition-all ${vendor.is_flagged
                                ? 'border-red-300 bg-red-50/50'
                                : vendor.kyc_velocity_alert
                                    ? 'border-amber-300 bg-amber-50/50'
                                    : 'border-platinum hover:border-platinum-dark hover:shadow-sm'
                                }`}
                        >
                            <div className="flex items-start gap-4">
                                {/* Avatar */}
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${vendor.is_flagged ? 'bg-red-100' : 'bg-gold/10'
                                    }`}>
                                    {vendor.is_flagged
                                        ? <ShieldAlert className="w-6 h-6 text-red-500" />
                                        : <ShieldCheck className="w-6 h-6 text-gold" />}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-semibold text-navy truncate">
                                            {vendor.full_name || 'Unnamed Vendor'}
                                        </h3>
                                        {vendor.is_flagged && (
                                            <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">
                                                <Flag className="w-3 h-3 inline-block mr-0.5" /> Flagged
                                            </span>
                                        )}
                                        {vendor.kyc_velocity_alert && !vendor.is_flagged && (
                                            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                                                <AlertTriangle className="w-3 h-3 inline-block mr-0.5" /> Velocity Alert
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-platinum-dark mb-3">{vendor.email}</p>

                                    {/* Stats Row */}
                                    <div className="flex flex-wrap gap-4 text-xs">
                                        <div className="flex items-center gap-1.5 text-platinum-dark">
                                            <Package className="w-3.5 h-3.5" />
                                            <span>{vendor.total_orders} orders</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-platinum-dark">
                                            <DollarSign className="w-3.5 h-3.5" />
                                            <span>{formatCurrency(vendor.total_escrowed)} escrowed</span>
                                        </div>
                                        <div className={`flex items-center gap-1.5 ${vendor.dispute_rate > 20 ? 'text-red-500' : 'text-platinum-dark'
                                            }`}>
                                            <TrendingDown className="w-3.5 h-3.5" />
                                            <span>{vendor.dispute_rate}% disputes</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-platinum-dark">
                                            <Clock className="w-3.5 h-3.5" />
                                            <span>KYC: {vendor.kyc_level || 'NONE'}</span>
                                        </div>
                                    </div>

                                    {vendor.is_flagged && vendor.flag_reason && (
                                        <p className="text-xs text-red-500/70 mt-2 italic">
                                            Reason: {vendor.flag_reason}
                                        </p>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex flex-col gap-2 flex-shrink-0">
                                    {/* Flag / Unflag */}
                                    <button
                                        onClick={() => setFlagModal({
                                            vendor,
                                            action: vendor.is_flagged ? 'UNFLAG' : 'FLAG',
                                        })}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium 
                      transition-colors cursor-pointer ${vendor.is_flagged
                                                ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200'
                                                : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                                            }`}
                                    >
                                        <Flag className="w-3.5 h-3.5" />
                                        {vendor.is_flagged ? 'Unflag' : 'Flag'}
                                    </button>

                                    {/* Treasury Toggle */}
                                    <button
                                        onClick={() => handleTreasuryToggle(vendor)}
                                        disabled={treasuryLoading === vendor.id}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium 
                      transition-colors cursor-pointer border disabled:opacity-50 ${vendor.treasury_mode === 'MANUAL_HOLD'
                                                ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                                : 'bg-platinum-light text-platinum-dark border-platinum hover:bg-platinum'
                                            }`}
                                        title={vendor.treasury_mode === 'AUTO' ? 'Switch to Manual Hold' : 'Switch to Auto-Payout'}
                                    >
                                        {vendor.treasury_mode === 'MANUAL_HOLD'
                                            ? <ToggleRight className="w-3.5 h-3.5" />
                                            : <ToggleLeft className="w-3.5 h-3.5" />}
                                        {vendor.treasury_mode === 'AUTO' ? 'Auto' : 'Hold'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>

            {/* ── FLAG CONFIRMATION MODAL ── */}
            <AnimatePresence>
                {flagModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => { setFlagModal(null); setFlagReason('') }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white border border-platinum rounded-2xl p-6 w-full max-w-md shadow-2xl"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${flagModal.action === 'FLAG' ? 'bg-red-100' : 'bg-emerald-100'
                                    }`}>
                                    <Flag className={`w-5 h-5 ${flagModal.action === 'FLAG' ? 'text-red-500' : 'text-emerald-500'
                                        }`} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-navy">
                                        {flagModal.action === 'FLAG' ? 'Flag Vendor' : 'Unflag Vendor'}
                                    </h3>
                                    <p className="text-sm text-platinum-dark">
                                        {flagModal.vendor.full_name || flagModal.vendor.email}
                                    </p>
                                </div>
                            </div>

                            {flagModal.action === 'FLAG' && (
                                <>
                                    <p className="text-sm text-platinum-dark mb-3">
                                        Flagging will freeze all locked escrow for this vendor. Enter a reason:
                                    </p>
                                    <textarea
                                        value={flagReason}
                                        onChange={(e) => setFlagReason(e.target.value)}
                                        placeholder="Enter reason for flagging..."
                                        rows={3}
                                        className="w-full px-4 py-3 bg-platinum-light border border-platinum rounded-xl text-navy 
                      placeholder:text-platinum-dark focus:outline-none focus:border-red-300 
                      resize-none transition-all mb-4"
                                    />
                                </>
                            )}

                            {flagModal.action === 'UNFLAG' && (
                                <p className="text-sm text-platinum-dark mb-4">
                                    This will remove the flag and allow normal operations for this vendor.
                                    Previously frozen escrow will not be automatically unfrozen.
                                </p>
                            )}

                            <div className="flex gap-3">
                                <button
                                    onClick={() => { setFlagModal(null); setFlagReason('') }}
                                    className="flex-1 px-4 py-3 bg-platinum-light text-platinum-dark rounded-xl hover:bg-platinum 
                    transition-colors font-medium cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleFlag}
                                    disabled={flagLoading}
                                    className={`flex-1 px-4 py-3 font-bold rounded-xl transition-colors 
                    disabled:opacity-50 cursor-pointer ${flagModal.action === 'FLAG'
                                            ? 'bg-red-600 text-white hover:bg-red-700'
                                            : 'bg-emerald-500 text-white hover:bg-emerald-600'
                                        }`}
                                >
                                    {flagLoading ? 'Processing...' : flagModal.action === 'FLAG' ? 'Flag Vendor' : 'Unflag Vendor'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
