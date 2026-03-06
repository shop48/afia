import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { apiClient } from '../../lib/api'
import {
    AlertTriangle, CheckCircle, Shield, Phone, ExternalLink, Eye,
    FileText, Loader2, Clock, DollarSign, X, Send, ChevronDown, ChevronUp,
    Package, RefreshCcw, HeartCrack, HelpCircle, Lock, Radio, Paperclip, CheckCircle2
} from 'lucide-react'
import { staggerContainer, staggerItem } from '../../lib/animations'

// ─── Types ───
interface Dispute {
    id: string
    status: string
    is_disputed: boolean
    dispute_reason: string | null
    dispute_category: string | null
    dispute_evidence_urls: string[] | null
    admin_notes: string | null
    disputed_at: string | null
    resolved_at: string | null
    resolved_by: string | null
    total_amount: number
    currency: string
    quantity: number
    shipping_type: string | null
    waybill_url: string | null
    courier_phone: string | null
    tracking_id: string | null
    estimated_delivery_date: string | null
    shipped_at: string | null
    delivered_at: string | null
    auto_release_at: string | null
    created_at: string
    product: { id: string; title: string; images?: string[]; base_price: number; currency: string } | null
    escrow: { id: string; gross_amount: number; fee_amount: number; net_payout: number; status: string; margin_check_passed: boolean } | null
    buyer: { id: string; full_name: string; email: string } | null
    vendor: { id: string; full_name: string; email: string; kyc_level: string } | null
}

const CATEGORY_MAP: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    NOT_RECEIVED: { label: 'Not Received', icon: <Package className="w-3.5 h-3.5" />, color: 'bg-orange-100 text-orange-700' },
    WRONG_ITEM: { label: 'Wrong Item', icon: <RefreshCcw className="w-3.5 h-3.5" />, color: 'bg-blue-100 text-blue-700' },
    DAMAGED: { label: 'Damaged', icon: <HeartCrack className="w-3.5 h-3.5" />, color: 'bg-red-100 text-red-700' },
    OTHER: { label: 'Other', icon: <HelpCircle className="w-3.5 h-3.5" />, color: 'bg-gray-100 text-gray-700' },
}

// ─── Helpers ───
function unwrapRelation<T>(val: T | T[] | null | undefined): T | null {
    if (!val) return null
    return Array.isArray(val) ? val[0] || null : val
}

function timeSince(dateStr: string): string {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
    if (seconds < 0) return 'just now'
    if (seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
}

// ═════════════════════════════════════════════
//  MAIN COMPONENT
// ═════════════════════════════════════════════

export default function DisputeArbitration() {
    const [disputes, setDisputes] = useState<Dispute[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [resolvingId, setResolvingId] = useState<string | null>(null)
    const [confirmAction, setConfirmAction] = useState<{ id: string; outcome: 'COMPLETED' | 'REFUNDED' } | null>(null)
    const [notesInput, setNotesInput] = useState<Record<string, string>>({})
    const [savingNotes, setSavingNotes] = useState<string | null>(null)
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

    const fetchDisputes = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const data = await apiClient<{ disputes: Dispute[] }>('/api/admin/disputes')
            setDisputes(data.disputes || [])
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load disputes')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchDisputes() }, [fetchDisputes])

    // Escape key handler for modals
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (lightboxUrl) setLightboxUrl(null)
                else if (confirmAction && !resolvingId) setConfirmAction(null)
            }
        }
        document.addEventListener('keydown', handleEscape)
        return () => document.removeEventListener('keydown', handleEscape)
    }, [lightboxUrl, confirmAction, resolvingId])

    // ─── Resolve dispute ───
    const handleResolve = async (orderId: string, outcome: 'COMPLETED' | 'REFUNDED') => {
        setResolvingId(orderId)
        try {
            await apiClient(`/api/admin/disputes/${encodeURIComponent(orderId)}/resolve`, {
                method: 'POST',
                body: JSON.stringify({ outcome, notes: notesInput[orderId] || '' }),
            })
            // Remove from list
            setDisputes(prev => prev.filter(d => d.id !== orderId))
            setConfirmAction(null)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to resolve dispute')
        } finally {
            setResolvingId(null)
        }
    }

    // ─── Save admin notes ───
    const handleSaveNotes = async (orderId: string) => {
        const notes = notesInput[orderId]
        if (!notes?.trim()) return
        setSavingNotes(orderId)
        try {
            await apiClient(`/api/admin/disputes/${encodeURIComponent(orderId)}/notes`, {
                method: 'POST',
                body: JSON.stringify({ notes }),
            })
            // Update local state and clear input
            setDisputes(prev => prev.map(d =>
                d.id === orderId ? { ...d, admin_notes: notes } : d
            ))
            setNotesInput(prev => { const next = { ...prev }; delete next[orderId]; return next })
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save notes')
        } finally {
            setSavingNotes(null)
        }
    }

    // ─── Stats ───
    const pending = disputes.filter(d => d.status === 'DISPUTED').length
    const totalValue = disputes.reduce((sum, d) => sum + (d.total_amount || 0), 0)

    // ─── Loading ───
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
            <div className="mb-8">
                <h1 className="text-2xl lg:text-3xl font-bold text-navy font-[family-name:var(--font-heading)]">
                    Dispute Arbitration
                </h1>
                <p className="text-platinum-dark mt-1">Review evidence, investigate, and resolve buyer disputes</p>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="bg-red-50 text-red-600 border border-red-200 px-4 py-3 rounded-xl mb-6 text-sm flex items-center justify-between">
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 cursor-pointer"><X size={16} /></button>
                </div>
            )}

            {/* Summary Cards */}
            <motion.div
                variants={staggerContainer}
                initial="initial"
                animate="animate"
                className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"
            >
                <motion.div variants={staggerItem} className="bg-white rounded-xl border border-platinum p-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                        </div>
                        <div>
                            <p className="text-xs text-platinum-dark font-medium">Active Disputes</p>
                            <p className="text-xl font-bold text-navy">{pending}</p>
                        </div>
                    </div>
                </motion.div>

                <motion.div variants={staggerItem} className="bg-white rounded-xl border border-platinum p-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center">
                            <DollarSign className="w-5 h-5 text-gold" />
                        </div>
                        <div>
                            <p className="text-xs text-platinum-dark font-medium">Total At Stake</p>
                            <p className="text-xl font-bold text-navy">
                                {disputes[0]?.currency || 'NGN'} {totalValue.toLocaleString()}
                            </p>
                        </div>
                    </div>
                </motion.div>

                <motion.div variants={staggerItem} className="bg-white rounded-xl border border-platinum p-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-navy/10 flex items-center justify-center">
                            <Clock className="w-5 h-5 text-navy" />
                        </div>
                        <div>
                            <p className="text-xs text-platinum-dark font-medium">Oldest Open</p>
                            <p className="text-xl font-bold text-navy">
                                {disputes.length > 0 && disputes[disputes.length - 1].disputed_at
                                    ? timeSince(disputes[disputes.length - 1].disputed_at!)
                                    : '—'}
                            </p>
                        </div>
                    </div>
                </motion.div>
            </motion.div>

            {/* Empty State */}
            {disputes.length === 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-16 bg-white rounded-2xl border border-platinum"
                >
                    <Shield className="w-16 h-16 text-neoa-emerald mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-navy font-[family-name:var(--font-heading)]">All Clear</h3>
                    <p className="text-platinum-dark mt-1">No active disputes require attention.</p>
                </motion.div>
            )}

            {/* Dispute Cards */}
            <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-4">
                {disputes.map((dispute) => {
                    const product = unwrapRelation(dispute.product)
                    const escrow = unwrapRelation(dispute.escrow)
                    const buyer = unwrapRelation(dispute.buyer)
                    const vendor = unwrapRelation(dispute.vendor)
                    const catInfo = dispute.dispute_category ? CATEGORY_MAP[dispute.dispute_category] : null
                    const isExpanded = expandedId === dispute.id

                    return (
                        <motion.div
                            key={dispute.id}
                            variants={staggerItem}
                            className="bg-white rounded-xl border border-platinum overflow-hidden hover:shadow-md transition-shadow"
                        >
                            {/* Card Header — always visible */}
                            <button
                                onClick={() => setExpandedId(isExpanded ? null : dispute.id)}
                                className="w-full p-5 text-left cursor-pointer flex items-start justify-between gap-4 bg-transparent border-none"
                            >
                                <div className="flex items-start gap-4 flex-1 min-w-0">
                                    {/* Avatar */}
                                    <div className="w-11 h-11 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold text-sm shrink-0">
                                        {buyer?.full_name?.[0]?.toUpperCase() || '?'}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="text-base font-semibold text-navy m-0 truncate">
                                                {product?.title || `Order #${dispute.id.slice(0, 8)}`}
                                            </h3>
                                            {catInfo && (
                                                <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-full ${catInfo.color}`}>
                                                    {catInfo.icon} {catInfo.label}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-platinum-dark mt-0.5 mb-0">
                                            by {buyer?.full_name || 'Unknown Buyer'} · {dispute.disputed_at ? timeSince(dispute.disputed_at) : 'Unknown'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 shrink-0">
                                    <span className="text-lg font-bold text-navy whitespace-nowrap">
                                        {dispute.currency} {dispute.total_amount?.toLocaleString()}
                                    </span>
                                    {isExpanded ? <ChevronUp className="w-5 h-5 text-platinum-dark" /> : <ChevronDown className="w-5 h-5 text-platinum-dark" />}
                                </div>
                            </button>

                            {/* Expanded Content */}
                            <AnimatePresence>
                                {isExpanded && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.25 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="px-5 pb-5 border-t border-platinum pt-4">
                                            {/* TWO-COLUMN: Buyer Evidence vs Vendor Proof */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                                                {/* Left: Buyer Evidence */}
                                                <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                                                    <h4 className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                                        <AlertTriangle size={14} /> Buyer's Evidence
                                                    </h4>

                                                    {dispute.dispute_reason && (
                                                        <p className="text-navy text-sm bg-white rounded-lg p-3 border border-red-100 mb-3">
                                                            "{dispute.dispute_reason}"
                                                        </p>
                                                    )}

                                                    {dispute.dispute_evidence_urls && dispute.dispute_evidence_urls.length > 0 ? (
                                                        <div className="flex flex-wrap gap-2">
                                                            {dispute.dispute_evidence_urls.map((url, i) => (
                                                                <button
                                                                    key={i}
                                                                    onClick={() => setLightboxUrl(url)}
                                                                    className="w-20 h-20 rounded-lg overflow-hidden border border-red-200 cursor-pointer hover:shadow-md transition-shadow bg-transparent p-0"
                                                                >
                                                                    <img src={url} alt={`Evidence ${i + 1}`} className="w-full h-full object-cover" />
                                                                </button>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="text-platinum-dark text-xs italic">No photos uploaded</p>
                                                    )}
                                                </div>

                                                {/* Right: Vendor Proof */}
                                                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                                                    <h4 className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                                        <FileText size={14} /> Vendor's Proof
                                                    </h4>

                                                    <div className="space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-xs text-platinum-dark">Vendor</span>
                                                            <span className="text-sm text-navy font-medium">{vendor?.full_name || 'N/A'}</span>
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-xs text-platinum-dark">KYC Level</span>
                                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${vendor?.kyc_level === 'VERIFIED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                                {vendor?.kyc_level || 'NONE'}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-xs text-platinum-dark">Shipping</span>
                                                            <span className="text-sm text-navy">
                                                                <span className="inline-flex items-center gap-1">{dispute.shipping_type === 'API_AUTOMATED' ? <><Radio className="w-3 h-3" /> API</> : <><Paperclip className="w-3 h-3" /> Waybill</>}</span>
                                                            </span>
                                                        </div>

                                                        {dispute.waybill_url && (
                                                            <a
                                                                href={dispute.waybill_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-sm font-medium mt-1 transition-colors"
                                                            >
                                                                <Eye size={14} /> View Waybill <ExternalLink size={12} />
                                                            </a>
                                                        )}

                                                        {dispute.tracking_id && (
                                                            <div>
                                                                <span className="text-xs text-platinum-dark">Tracking</span>
                                                                <p className="text-sm text-navy font-mono mt-0.5 m-0">{dispute.tracking_id}</p>
                                                            </div>
                                                        )}

                                                        {dispute.courier_phone && (
                                                            <a
                                                                href={`tel:${dispute.courier_phone}`}
                                                                className="flex items-center gap-1.5 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors mt-2"
                                                            >
                                                                <Phone size={14} /> Call Courier: {dispute.courier_phone}
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Escrow Status */}
                                            {escrow && (
                                                <div className="bg-platinum-light rounded-xl p-4 mb-4 flex flex-wrap items-center gap-4">
                                                    <div>
                                                        <span className="text-xs text-platinum-dark">Gross</span>
                                                        <p className="text-sm font-bold text-navy m-0">{dispute.currency} {escrow.gross_amount?.toLocaleString()}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-xs text-platinum-dark">Fee (15%)</span>
                                                        <p className="text-sm font-medium text-platinum-dark m-0">{dispute.currency} {escrow.fee_amount?.toLocaleString()}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-xs text-platinum-dark">Net Payout</span>
                                                        <p className="text-sm font-bold text-neoa-emerald m-0">{dispute.currency} {escrow.net_payout?.toLocaleString()}</p>
                                                    </div>
                                                    <div className="ml-auto">
                                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${escrow.status === 'LOCKED' ? 'bg-amber-100 text-amber-700' : escrow.status === 'RELEASED' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                                                            <Lock className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" /> {escrow.status}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Admin Notes */}
                                            <div className="mb-4">
                                                <label className="text-xs font-semibold text-navy uppercase tracking-wider block mb-2">
                                                    Admin Notes
                                                </label>
                                                {dispute.admin_notes && (
                                                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-2 text-sm text-navy">
                                                        {dispute.admin_notes}
                                                    </div>
                                                )}
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        placeholder="Add investigation notes..."
                                                        value={notesInput[dispute.id] || ''}
                                                        onChange={e => setNotesInput(prev => ({ ...prev, [dispute.id]: e.target.value }))}
                                                        className="flex-1 px-3 py-2 text-sm border border-platinum rounded-lg outline-none focus:border-gold transition-colors"
                                                    />
                                                    <button
                                                        onClick={() => handleSaveNotes(dispute.id)}
                                                        disabled={!notesInput[dispute.id]?.trim() || savingNotes === dispute.id}
                                                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium border border-platinum rounded-lg text-navy hover:bg-platinum-light transition-colors cursor-pointer disabled:opacity-50"
                                                    >
                                                        {savingNotes === dispute.id ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                                        Save
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Resolution Actions */}
                                            <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-platinum">
                                                <button
                                                    onClick={() => setConfirmAction({ id: dispute.id, outcome: 'COMPLETED' })}
                                                    disabled={resolvingId === dispute.id}
                                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-neoa-emerald text-white rounded-xl font-semibold cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50"
                                                >
                                                    <CheckCircle size={18} /> Pay Vendor (Force Complete)
                                                </button>
                                                <button
                                                    onClick={() => setConfirmAction({ id: dispute.id, outcome: 'REFUNDED' })}
                                                    disabled={resolvingId === dispute.id}
                                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-xl font-semibold cursor-pointer hover:bg-red-700 transition-colors disabled:opacity-50"
                                                >
                                                    <AlertTriangle size={18} /> Refund Buyer (Force Refund)
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    )
                })}
            </motion.div>

            {/* Confirmation Modal */}
            <AnimatePresence>
                {confirmAction && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                        onClick={() => !resolvingId && setConfirmAction(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${confirmAction.outcome === 'COMPLETED' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                                    {confirmAction.outcome === 'COMPLETED'
                                        ? <CheckCircle className="w-6 h-6 text-emerald-600" />
                                        : <AlertTriangle className="w-6 h-6 text-red-600" />
                                    }
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-navy m-0">
                                        {confirmAction.outcome === 'COMPLETED' ? 'Force Complete Order?' : 'Force Refund Buyer?'}
                                    </h3>
                                    <p className="text-platinum-dark text-sm m-0">This action cannot be undone.</p>
                                </div>
                            </div>

                            <div className={`rounded-xl p-4 mb-4 text-sm ${confirmAction.outcome === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                                {confirmAction.outcome === 'COMPLETED'
                                    ? <><CheckCircle2 className="w-4 h-4 inline-block mr-1.5 -mt-0.5" /> This will release locked funds to the vendor and mark the order as COMPLETED.</>
                                    : <><Lock className="w-4 h-4 inline-block mr-1.5 -mt-0.5" /> This will freeze the escrowed funds and mark the order as REFUNDED for buyer refund processing.</>
                                }
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setConfirmAction(null)}
                                    disabled={!!resolvingId}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-platinum-light text-platinum-dark font-medium cursor-pointer hover:bg-platinum transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleResolve(confirmAction.id, confirmAction.outcome)}
                                    disabled={!!resolvingId}
                                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white font-semibold cursor-pointer transition-opacity disabled:opacity-50 ${confirmAction.outcome === 'COMPLETED' ? 'bg-neoa-emerald hover:opacity-90' : 'bg-red-600 hover:bg-red-700'}`}
                                >
                                    {resolvingId ? (
                                        <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                        confirmAction.outcome === 'COMPLETED' ? 'Confirm: Pay Vendor' : 'Confirm: Refund Buyer'
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Image Lightbox */}
            <AnimatePresence>
                {lightboxUrl && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
                        onClick={() => setLightboxUrl(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.85 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.85 }}
                            className="relative max-w-3xl max-h-[85vh]"
                        >
                            <button
                                onClick={() => setLightboxUrl(null)}
                                className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center cursor-pointer hover:bg-platinum-light transition-colors z-10"
                            >
                                <X size={16} />
                            </button>
                            <img
                                src={lightboxUrl}
                                alt="Evidence full view"
                                className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
                            />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
