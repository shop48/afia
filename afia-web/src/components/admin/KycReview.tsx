import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    ShieldCheck, ShieldX, UserCheck, Clock, Globe,
    CheckCircle2, XCircle, AlertTriangle, FileText,
    RefreshCw, ChevronDown, ChevronUp,
} from 'lucide-react'
import { apiClient } from '../../lib/api'

// ═══════════════════════════════════════════════
// ADMIN — KYC REVIEW PANEL
// Manual vendor verification (approve/reject)
// ═══════════════════════════════════════════════

interface PendingVendor {
    id: string
    full_name: string | null
    email: string
    kyc_level: string
    kyc_tier: string
    kyc_provider: string | null
    kyc_method: string | null
    kyc_country: string | null
    kyc_submitted_at: string | null
    kyc_admin_notes: string | null
    created_at: string
}

const COUNTRY_NAMES: Record<string, string> = {
    NG: '🇳🇬 Nigeria', GH: '🇬🇭 Ghana', KE: '🇰🇪 Kenya',
    ZA: '🇿🇦 South Africa', UG: '🇺🇬 Uganda', CI: "🇨🇮 Côte d'Ivoire",
    ZM: '🇿🇲 Zambia', US: '🇺🇸 United States', GB: '🇬🇧 United Kingdom',
}

export default function KycReview() {
    const [pending, setPending] = useState<PendingVendor[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [actionModal, setActionModal] = useState<{
        vendor: PendingVendor
        action: 'approve' | 'reject'
    } | null>(null)
    const [notes, setNotes] = useState('')
    const [selectedTier, setSelectedTier] = useState<'TIER_1' | 'TIER_2'>('TIER_1')
    const [actionLoading, setActionLoading] = useState(false)
    const [expandedId, setExpandedId] = useState<string | null>(null)

    const fetchPending = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const data = await apiClient<{ vendors: PendingVendor[] }>('/api/admin/kyc/pending')
            setPending(data.vendors || [])
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load pending KYC reviews')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchPending() }, [fetchPending])

    // Auto-dismiss success message
    useEffect(() => {
        if (success) {
            const t = setTimeout(() => setSuccess(null), 4000)
            return () => clearTimeout(t)
        }
    }, [success])

    const handleAction = async () => {
        if (!actionModal) return
        if (!notes.trim() || notes.trim().length < 5) {
            setError('Admin notes are required (min 5 characters)')
            return
        }

        setActionLoading(true)
        setError(null)
        try {
            const data = await apiClient<{ message: string; tier?: string }>('/api/admin/kyc/verify', {
                method: 'POST',
                body: JSON.stringify({
                    vendorId: actionModal.vendor.id,
                    action: actionModal.action,
                    tier: actionModal.action === 'approve' ? selectedTier : undefined,
                    notes: notes.trim(),
                }),
            })
            setSuccess(data.message)
            setActionModal(null)
            setNotes('')
            setSelectedTier('TIER_1')
            fetchPending()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Action failed')
        } finally {
            setActionLoading(false)
        }
    }

    const timeAgo = (dateStr: string | null) => {
        if (!dateStr) return 'Unknown'
        const diff = Date.now() - new Date(dateStr).getTime()
        const mins = Math.floor(diff / 60000)
        if (mins < 60) return `${mins}m ago`
        const hours = Math.floor(mins / 60)
        if (hours < 24) return `${hours}h ago`
        const days = Math.floor(hours / 24)
        return `${days}d ago`
    }

    // Loading skeleton
    if (loading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse bg-platinum-light rounded-2xl h-28 border border-platinum" />
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
                        KYC Review Queue
                    </h2>
                    <p className="text-sm text-platinum-dark mt-1">
                        {pending.length} vendor{pending.length !== 1 ? 's' : ''} awaiting verification
                    </p>
                </div>
                <button
                    onClick={fetchPending}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-platinum rounded-xl
                       text-sm text-navy hover:border-gold/50 transition-all cursor-pointer"
                >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </button>
            </div>

            {/* Success Alert */}
            <AnimatePresence>
                {success && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3"
                    >
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                        <p className="text-sm text-emerald-700 font-medium">{success}</p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Error Alert */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-4 text-sm">
                    {error}
                    <button onClick={() => setError(null)} className="ml-2 underline cursor-pointer">Dismiss</button>
                </div>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
                    <Clock className="w-6 h-6 text-amber-500 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-amber-700">{pending.length}</p>
                    <p className="text-xs text-amber-600">Pending Review</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
                    <ShieldCheck className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-emerald-700">—</p>
                    <p className="text-xs text-emerald-600">Approved Today</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
                    <ShieldX className="w-6 h-6 text-red-400 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-red-600">—</p>
                    <p className="text-xs text-red-500">Rejected Today</p>
                </div>
            </div>

            {/* Pending Vendor Cards */}
            <div className="space-y-3">
                {pending.length === 0 ? (
                    <div className="text-center py-16 bg-white border border-platinum rounded-2xl">
                        <UserCheck className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                        <p className="text-lg font-semibold text-navy mb-1">All Caught Up!</p>
                        <p className="text-sm text-platinum-dark">
                            No vendors are waiting for KYC review.
                        </p>
                    </div>
                ) : (
                    pending.map((vendor) => (
                        <motion.div
                            key={vendor.id}
                            layout
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white border border-amber-200 rounded-2xl overflow-hidden
                                       hover:border-amber-300 hover:shadow-sm transition-all"
                        >
                            {/* Main Row */}
                            <div className="p-5 flex items-start gap-4">
                                {/* Avatar */}
                                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                                    <Clock className="w-6 h-6 text-amber-500" />
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-semibold text-navy truncate">
                                            {vendor.full_name || 'Unnamed Vendor'}
                                        </h3>
                                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                                            Pending Review
                                        </span>
                                    </div>
                                    <p className="text-xs text-platinum-dark mb-2">{vendor.email || vendor.id.slice(0, 8)}</p>

                                    <div className="flex flex-wrap gap-3 text-xs">
                                        <div className="flex items-center gap-1.5 text-platinum-dark">
                                            <Globe className="w-3.5 h-3.5" />
                                            <span>{vendor.kyc_country ? (COUNTRY_NAMES[vendor.kyc_country] || vendor.kyc_country) : 'N/A'}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-platinum-dark">
                                            <FileText className="w-3.5 h-3.5" />
                                            <span>{vendor.kyc_method || 'N/A'}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-platinum-dark">
                                            <Clock className="w-3.5 h-3.5" />
                                            <span>Submitted {timeAgo(vendor.kyc_submitted_at)}</span>
                                        </div>
                                    </div>

                                    {/* Admin Notes (submission info) */}
                                    {vendor.kyc_admin_notes && (
                                        <button
                                            onClick={() => setExpandedId(expandedId === vendor.id ? null : vendor.id)}
                                            className="flex items-center gap-1 text-xs text-gold hover:text-gold/80 mt-2 cursor-pointer"
                                        >
                                            {expandedId === vendor.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                            Submission details
                                        </button>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2 flex-shrink-0">
                                    <button
                                        onClick={() => { setActionModal({ vendor, action: 'approve' }); setNotes(''); setSelectedTier('TIER_1') }}
                                        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-white rounded-xl text-xs
                                                   font-bold hover:bg-emerald-600 transition-colors cursor-pointer shadow-sm"
                                    >
                                        <CheckCircle2 className="w-4 h-4" />
                                        Approve
                                    </button>
                                    <button
                                        onClick={() => { setActionModal({ vendor, action: 'reject' }); setNotes('') }}
                                        className="flex items-center gap-2 px-4 py-2.5 bg-white text-red-500 border border-red-200 rounded-xl
                                                   text-xs font-bold hover:bg-red-50 transition-colors cursor-pointer"
                                    >
                                        <XCircle className="w-4 h-4" />
                                        Reject
                                    </button>
                                </div>
                            </div>

                            {/* Expanded Notes */}
                            <AnimatePresence>
                                {expandedId === vendor.id && vendor.kyc_admin_notes && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="px-5 pb-4 pt-0 border-t border-amber-100">
                                            <p className="text-xs text-platinum-dark mt-3 bg-amber-50 p-3 rounded-lg font-mono">
                                                {vendor.kyc_admin_notes}
                                            </p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    ))
                )}
            </div>

            {/* ── APPROVE / REJECT MODAL ── */}
            <AnimatePresence>
                {actionModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => { setActionModal(null); setNotes('') }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white border border-platinum rounded-2xl p-6 w-full max-w-md shadow-2xl"
                        >
                            {/* Modal Header */}
                            <div className="flex items-center gap-3 mb-5">
                                <div className={`w-11 h-11 rounded-full flex items-center justify-center ${
                                    actionModal.action === 'approve' ? 'bg-emerald-100' : 'bg-red-100'
                                }`}>
                                    {actionModal.action === 'approve'
                                        ? <ShieldCheck className="w-5 h-5 text-emerald-500" />
                                        : <ShieldX className="w-5 h-5 text-red-500" />}
                                </div>
                                <div>
                                    <h3 className="font-bold text-navy text-lg">
                                        {actionModal.action === 'approve' ? 'Approve Vendor' : 'Reject Vendor'}
                                    </h3>
                                    <p className="text-sm text-platinum-dark">
                                        {actionModal.vendor.full_name || actionModal.vendor.id.slice(0, 8)}
                                        {actionModal.vendor.kyc_country && (
                                            <span className="ml-2">
                                                {COUNTRY_NAMES[actionModal.vendor.kyc_country] || actionModal.vendor.kyc_country}
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </div>

                            {/* Tier Selection (approve only) */}
                            {actionModal.action === 'approve' && (
                                <div className="mb-4">
                                    <label className="text-sm font-medium text-navy block mb-2">
                                        Verification Tier
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => setSelectedTier('TIER_1')}
                                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                                                selectedTier === 'TIER_1'
                                                    ? 'border-gold bg-gold/5 ring-2 ring-gold/20'
                                                    : 'border-platinum hover:border-platinum-dark'
                                            }`}
                                        >
                                            <p className="font-bold text-sm text-navy">TIER 1</p>
                                            <p className="text-xs text-platinum-dark mt-0.5">Basic — Unlimited listings, payouts enabled</p>
                                        </button>
                                        <button
                                            onClick={() => setSelectedTier('TIER_2')}
                                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                                                selectedTier === 'TIER_2'
                                                    ? 'border-gold bg-gold/5 ring-2 ring-gold/20'
                                                    : 'border-platinum hover:border-platinum-dark'
                                            }`}
                                        >
                                            <p className="font-bold text-sm text-navy">TIER 2</p>
                                            <p className="text-xs text-platinum-dark mt-0.5">Full — No limits, priority support</p>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Rejection Warning */}
                            {actionModal.action === 'reject' && (
                                <div className="bg-red-50 border border-red-100 rounded-xl p-3 mb-4 flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                                    <p className="text-xs text-red-600">
                                        Rejecting will keep this vendor at TIER_0 with limited platform access.
                                        They can resubmit for verification.
                                    </p>
                                </div>
                            )}

                            {/* Admin Notes (required) */}
                            <div className="mb-5">
                                <label className="text-sm font-medium text-navy block mb-2">
                                    Admin Notes <span className="text-red-400">*</span>
                                </label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder={actionModal.action === 'approve'
                                        ? 'e.g., Verified vendor identity via phone call and document review'
                                        : 'e.g., ID document appears tampered, unable to verify identity'
                                    }
                                    rows={3}
                                    className="w-full px-4 py-3 bg-platinum-light border border-platinum rounded-xl text-navy
                                               placeholder:text-platinum-dark focus:outline-none focus:border-gold/50 focus:ring-2
                                               focus:ring-gold/10 resize-none transition-all text-sm"
                                />
                                <p className="text-xs text-platinum-dark mt-1">
                                    Required — explain your verification decision for the audit trail
                                </p>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => { setActionModal(null); setNotes('') }}
                                    className="flex-1 px-4 py-3 bg-platinum-light text-platinum-dark rounded-xl
                                               hover:bg-platinum transition-colors font-medium cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAction}
                                    disabled={actionLoading || notes.trim().length < 5}
                                    className={`flex-1 px-4 py-3 font-bold rounded-xl transition-colors
                                                disabled:opacity-40 cursor-pointer ${
                                        actionModal.action === 'approve'
                                            ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                                            : 'bg-red-500 text-white hover:bg-red-600'
                                    }`}
                                >
                                    {actionLoading
                                        ? 'Processing...'
                                        : actionModal.action === 'approve'
                                            ? `Approve → ${selectedTier}`
                                            : 'Reject Vendor'
                                    }
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
