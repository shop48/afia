import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Shield, CheckCircle, AlertTriangle, RefreshCw,
    Lock, Eye, X, ChevronDown, ChevronUp,
    DollarSign, Package, Flag,
} from 'lucide-react'
import { apiClient } from '../../lib/api'

// ═══════════════════════════════════════════════
// MODULE 7.1: ENHANCED PAYOUT GATE
// Batch selection, Margin Guard, MFA, Recalculate
// ═══════════════════════════════════════════════

interface PayoutItem {
    order_id: string
    vendor_id: string
    vendor_name: string
    vendor_email: string
    settlement_currency: string
    vendor_flagged: boolean
    treasury_mode: string
    kyc_level: string
    escrow_id: string
    gross_amount: number
    fee_amount: number
    net_payout: number
    payout_rail_type: string
    margin_check_passed: boolean
    vault_status: string
    margin_status: 'SAFE' | 'DRIFT_WARNING'
    margin_drift: number
    auto_release_at: string
    waybill_url: string | null
    shipping_type: string
    tracking_id: string | null
    delivered_at: string
    order_created_at: string
    total_amount: number
    order_currency: string
    quantity: number
}

interface BatchResult {
    orderId: string
    status: 'RELEASED' | 'SKIPPED' | 'FAILED' | 'PARTIAL'
    error?: string
}

export default function PayoutQueue() {
    const [queue, setQueue] = useState<PayoutItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [showMfaModal, setShowMfaModal] = useState(false)
    const [masterPassword, setMasterPassword] = useState('')
    const [executing, setExecuting] = useState(false)
    const [recalculating, setRecalculating] = useState(false)
    const [batchResults, setBatchResults] = useState<BatchResult[] | null>(null)
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
    const [expandedRow, setExpandedRow] = useState<string | null>(null)
    const [totalPayout, setTotalPayout] = useState(0)

    const fetchQueue = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const data = await apiClient<{ queue: PayoutItem[]; total_payout: number }>('/api/admin/payout/queue')
            setQueue(data.queue || [])
            setTotalPayout(data.total_payout || 0)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load payout queue')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchQueue() }, [fetchQueue])

    // Selection helpers
    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }

    const toggleAll = () => {
        if (selectedIds.size === queue.length) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(queue.map(item => item.order_id)))
        }
    }

    const selectedTotal = queue
        .filter(item => selectedIds.has(item.order_id))
        .reduce((sum, item) => sum + item.net_payout, 0)

    const selectedDrift = queue
        .filter(item => selectedIds.has(item.order_id) && item.margin_status === 'DRIFT_WARNING')
        .length

    // Recalculate Batch (re-fetch with live FX)
    const handleRecalculate = async () => {
        setRecalculating(true)
        await fetchQueue()
        setRecalculating(false)
    }

    // Execute Batch
    const handleExecuteBatch = async () => {
        if (!masterPassword.trim()) return
        setExecuting(true)
        try {
            const data = await apiClient<{ results: BatchResult[] }>('/api/admin/payout/execute-batch', {
                method: 'POST',
                body: JSON.stringify({
                    orderIds: Array.from(selectedIds),
                    masterPassword,
                }),
            })
            setBatchResults(data.results || [])
            setShowMfaModal(false)
            setMasterPassword('')
            setSelectedIds(new Set())
            // Refresh queue
            setTimeout(fetchQueue, 1000)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Batch execution failed')
        } finally {
            setExecuting(false)
        }
    }

    const formatCurrency = (amount: number, currency = 'NGN') =>
        new Intl.NumberFormat('en-NG', { style: 'currency', currency }).format(amount)

    const formatDate = (date: string) =>
        new Date(date).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
        })

    // ── RENDER ──
    if (loading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse bg-white/5 rounded-2xl h-24 border border-white/10" />
                ))}
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* ── HEADER & SUMMARY CARDS ── */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gold font-[family-name:var(--font-heading)]">
                        Friday Payout Gate
                    </h2>
                    <p className="text-sm text-platinum-dark mt-1">
                        {queue.length} order{queue.length !== 1 ? 's' : ''} ready for payout
                    </p>
                </div>
                <button
                    onClick={handleRecalculate}
                    disabled={recalculating}
                    className="flex items-center gap-2 px-4 py-2 bg-navy-light text-platinum rounded-xl 
            hover:bg-navy transition-colors text-sm font-medium disabled:opacity-50 cursor-pointer"
                >
                    <RefreshCw className={`w-4 h-4 ${recalculating ? 'animate-spin' : ''}`} />
                    Recalculate Batch
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-gold/10 to-gold/5 border border-gold/20 rounded-2xl p-4">
                    <div className="flex items-center gap-2 text-gold mb-1">
                        <DollarSign className="w-4 h-4" />
                        <span className="text-xs font-medium uppercase tracking-wider">Total Payout</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{formatCurrency(totalPayout)}</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4">
                    <div className="flex items-center gap-2 text-emerald-400 mb-1">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-xs font-medium uppercase tracking-wider">Margin Safe</span>
                    </div>
                    <p className="text-2xl font-bold text-white">
                        {queue.filter(q => q.margin_status === 'SAFE').length}
                    </p>
                </div>
                <div className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20 rounded-2xl p-4">
                    <div className="flex items-center gap-2 text-amber-400 mb-1">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-xs font-medium uppercase tracking-wider">FX Drift</span>
                    </div>
                    <p className="text-2xl font-bold text-white">
                        {queue.filter(q => q.margin_status === 'DRIFT_WARNING').length}
                    </p>
                </div>
                <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-2xl p-4">
                    <div className="flex items-center gap-2 text-blue-400 mb-1">
                        <Package className="w-4 h-4" />
                        <span className="text-xs font-medium uppercase tracking-wider">Selected</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{selectedIds.size}</p>
                </div>
            </div>

            {error && (
                <div className="bg-ruby/10 border border-ruby/30 text-ruby rounded-xl p-4 text-sm">
                    {error}
                    <button onClick={() => setError(null)} className="ml-2 underline cursor-pointer">Dismiss</button>
                </div>
            )}

            {/* ── BATCH RESULTS ── */}
            <AnimatePresence>
                {batchResults && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-bold text-emerald-400">Batch Execution Results</h3>
                            <button onClick={() => setBatchResults(null)} className="text-platinum-dark hover:text-white cursor-pointer">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="space-y-1 text-sm">
                            {batchResults.map(r => (
                                <div key={r.orderId} className="flex items-center gap-2">
                                    {r.status === 'RELEASED' ? (
                                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                                    ) : (
                                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                                    )}
                                    <span className="text-platinum font-mono text-xs">{r.orderId.slice(0, 8)}...</span>
                                    <span className={r.status === 'RELEASED' ? 'text-emerald-400' : 'text-amber-400'}>
                                        {r.status}
                                    </span>
                                    {r.error && <span className="text-ruby text-xs">— {r.error}</span>}
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── PAYOUT LIST ── */}
            {queue.length === 0 ? (
                <div className="text-center py-16">
                    <Shield className="w-12 h-12 text-platinum-dark mx-auto mb-4" />
                    <p className="text-platinum-dark">No orders pending payout. The vault is clear.</p>
                </div>
            ) : (
                <>
                    {/* Select All Bar */}
                    <div className="flex items-center justify-between bg-navy-light/50 border border-white/10 rounded-xl px-4 py-3">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={selectedIds.size === queue.length && queue.length > 0}
                                onChange={toggleAll}
                                className="w-5 h-5 rounded accent-gold cursor-pointer"
                            />
                            <span className="text-sm text-platinum font-medium">
                                Select All ({queue.length})
                            </span>
                        </label>
                        {selectedIds.size > 0 && (
                            <div className="flex items-center gap-4 text-sm">
                                <span className="text-platinum-dark">
                                    {selectedIds.size} selected · {formatCurrency(selectedTotal)} total
                                </span>
                                {selectedDrift > 0 && (
                                    <span className="text-amber-400 flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3" />
                                        {selectedDrift} with FX drift
                                    </span>
                                )}
                                <button
                                    onClick={() => setShowMfaModal(true)}
                                    className="flex items-center gap-2 px-5 py-2 bg-gold text-navy-dark font-bold rounded-full
                    hover:bg-gold-light transition-colors cursor-pointer shadow-lg shadow-gold/20"
                                >
                                    <Lock className="w-4 h-4" />
                                    Approve & Execute Batch
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Order Rows */}
                    <div className="space-y-3">
                        {queue.map((item) => (
                            <motion.div
                                key={item.order_id}
                                layout
                                className={`bg-navy-light/30 border rounded-2xl transition-all ${selectedIds.has(item.order_id)
                                    ? 'border-gold/40 bg-gold/5'
                                    : 'border-white/10 hover:border-white/20'
                                    } ${item.vendor_flagged ? 'ring-2 ring-ruby/30' : ''}`}
                            >
                                <div className="flex items-center gap-4 px-5 py-4">
                                    {/* Checkbox */}
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.has(item.order_id)}
                                        onChange={() => toggleSelect(item.order_id)}
                                        className="w-5 h-5 rounded accent-gold flex-shrink-0 cursor-pointer"
                                    />

                                    {/* Margin Status */}
                                    <div className="flex-shrink-0" title={`FX drift: ${(item.margin_drift * 100).toFixed(2)}%`}>
                                        {item.margin_status === 'SAFE' ? (
                                            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                                <CheckCircle className="w-4 h-4 text-emerald-400" />
                                            </div>
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center animate-pulse">
                                                <AlertTriangle className="w-4 h-4 text-amber-400" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Vendor Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-semibold text-white truncate">{item.vendor_name || 'Unknown Vendor'}</p>
                                            {item.vendor_flagged && (
                                                <span className="text-xs bg-ruby/20 text-ruby px-2 py-0.5 rounded-full"><Flag className="w-3 h-3 inline-block mr-0.5" /> Flagged</span>
                                            )}
                                            {item.treasury_mode === 'MANUAL_HOLD' && (
                                                <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">Manual Hold</span>
                                            )}
                                        </div>
                                        <p className="text-xs text-platinum-dark">{item.vendor_email}</p>
                                    </div>

                                    {/* Payout Amount */}
                                    <div className="text-right flex-shrink-0">
                                        <p className="font-bold text-gold text-lg">{formatCurrency(item.net_payout)}</p>
                                        <p className="text-xs text-platinum-dark">
                                            of {formatCurrency(item.gross_amount)} gross
                                        </p>
                                    </div>

                                    {/* Waybill Preview */}
                                    {item.waybill_url && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setLightboxUrl(item.waybill_url) }}
                                            className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/5 border border-white/10 
                        flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer"
                                            title="View waybill"
                                        >
                                            <Eye className="w-4 h-4 text-platinum" />
                                        </button>
                                    )}

                                    {/* Expand Toggle */}
                                    <button
                                        onClick={() => setExpandedRow(expandedRow === item.order_id ? null : item.order_id)}
                                        className="flex-shrink-0 text-platinum-dark hover:text-white transition-colors cursor-pointer"
                                    >
                                        {expandedRow === item.order_id
                                            ? <ChevronUp className="w-5 h-5" />
                                            : <ChevronDown className="w-5 h-5" />}
                                    </button>
                                </div>

                                {/* Expanded Details */}
                                <AnimatePresence>
                                    {expandedRow === item.order_id && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="px-5 pb-4 pt-0 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs border-t border-white/5 mt-0 pt-4">
                                                <div>
                                                    <p className="text-platinum-dark">Order ID</p>
                                                    <p className="text-platinum font-mono mt-0.5">{item.order_id.slice(0, 12)}...</p>
                                                </div>
                                                <div>
                                                    <p className="text-platinum-dark">Delivered</p>
                                                    <p className="text-platinum mt-0.5">{item.delivered_at ? formatDate(item.delivered_at) : '—'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-platinum-dark">Auto Release</p>
                                                    <p className="text-platinum mt-0.5">{item.auto_release_at ? formatDate(item.auto_release_at) : '—'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-platinum-dark">Payout Rail</p>
                                                    <p className="text-platinum mt-0.5">{item.payout_rail_type || 'Not set'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-platinum-dark">KYC Level</p>
                                                    <p className="text-platinum mt-0.5">{item.kyc_level || 'NONE'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-platinum-dark">Shipping Type</p>
                                                    <p className="text-platinum mt-0.5">{item.shipping_type}</p>
                                                </div>
                                                <div>
                                                    <p className="text-platinum-dark">Margin Drift</p>
                                                    <p className={`mt-0.5 font-mono ${item.margin_status === 'SAFE' ? 'text-emerald-400' : 'text-amber-400'}`}>
                                                        {(item.margin_drift * 100).toFixed(2)}%
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-platinum-dark">Settlement</p>
                                                    <p className="text-platinum mt-0.5">{item.settlement_currency}</p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        ))}
                    </div>
                </>
            )}

            {/* ── MFA / MASTER PASSWORD MODAL ── */}
            <AnimatePresence>
                {showMfaModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => { setShowMfaModal(false); setMasterPassword('') }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-navy-dark border border-gold/30 rounded-2xl p-6 w-full max-w-md shadow-2xl"
                        >
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center">
                                    <Lock className="w-6 h-6 text-gold" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white font-[family-name:var(--font-heading)]">
                                        Authorize Batch Payout
                                    </h3>
                                    <p className="text-sm text-platinum-dark">
                                        Enter master password to release {selectedIds.size} order{selectedIds.size !== 1 ? 's' : ''}
                                    </p>
                                </div>
                            </div>

                            <div className="bg-gold/5 border border-gold/20 rounded-xl p-4 mb-6">
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-platinum-dark">Orders</span>
                                    <span className="text-white font-bold">{selectedIds.size}</span>
                                </div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-platinum-dark">Total Payout</span>
                                    <span className="text-gold font-bold">{formatCurrency(selectedTotal)}</span>
                                </div>
                                {selectedDrift > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-amber-400"><AlertTriangle className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" /> FX Drift Warnings</span>
                                        <span className="text-amber-400 font-bold">{selectedDrift}</span>
                                    </div>
                                )}
                            </div>

                            <input
                                type="password"
                                value={masterPassword}
                                onChange={(e) => setMasterPassword(e.target.value)}
                                placeholder="Enter master password"
                                autoFocus
                                className="w-full px-4 py-3 bg-navy-light border border-white/20 rounded-xl text-white 
                  placeholder:text-platinum-dark focus:outline-none focus:border-gold/50 focus:ring-2 
                  focus:ring-gold/20 transition-all mb-4"
                                onKeyDown={(e) => e.key === 'Enter' && handleExecuteBatch()}
                            />

                            <div className="flex gap-3">
                                <button
                                    onClick={() => { setShowMfaModal(false); setMasterPassword('') }}
                                    className="flex-1 px-4 py-3 bg-white/5 text-platinum rounded-xl hover:bg-white/10 
                    transition-colors font-medium cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleExecuteBatch}
                                    disabled={executing || !masterPassword.trim()}
                                    className="flex-1 px-4 py-3 bg-gold text-navy-dark font-bold rounded-full 
                    hover:bg-gold-light transition-colors disabled:opacity-50 cursor-pointer
                    shadow-lg shadow-gold/20"
                                >
                                    {executing ? (
                                        <span className="flex items-center gap-2 justify-center">
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                            Executing...
                                        </span>
                                    ) : (
                                        'Confirm & Execute'
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── WAYBILL LIGHTBOX ── */}
            <AnimatePresence>
                {lightboxUrl && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-8"
                        onClick={() => setLightboxUrl(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.8 }}
                            className="relative max-w-2xl max-h-[80vh]"
                        >
                            <button
                                onClick={() => setLightboxUrl(null)}
                                className="absolute -top-3 -right-3 w-8 h-8 bg-navy-dark border border-white/20 
                  rounded-full flex items-center justify-center text-white hover:bg-ruby transition-colors cursor-pointer z-10"
                            >
                                <X className="w-4 h-4" />
                            </button>
                            <img
                                src={lightboxUrl}
                                alt="Waybill proof"
                                className="rounded-2xl max-h-[80vh] object-contain border border-white/20"
                            />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
