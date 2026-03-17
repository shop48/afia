import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Shield, CheckCircle, AlertTriangle, RefreshCw,
    Lock, Eye, X, ChevronDown, ChevronUp,
    DollarSign, Package, Flag, Globe, Copy, ExternalLink,
} from 'lucide-react'
import { apiClient } from '../../lib/api'

// ═══════════════════════════════════════════════
// MODULE 7.1: ENHANCED PAYOUT GATE (LIGHT THEME)
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
    vendor_bank_account: string | null
    vendor_bank_code: string | null
    vendor_bank_name: string | null
    vendor_account_holder: string | null
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
    // Manual international payout state
    const [markPaidItem, setMarkPaidItem] = useState<PayoutItem | null>(null)
    const [wiseReference, setWiseReference] = useState('')
    const [markPaidPassword, setMarkPaidPassword] = useState('')
    const [markingPaid, setMarkingPaid] = useState(false)
    const [copiedField, setCopiedField] = useState<string | null>(null)

    const fetchQueue = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const data = await apiClient<{ queue: PayoutItem[]; total_payout: number }>('/api/admin/payout/queue')
            setQueue(data.queue || [])
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

    // Mark as Paid handler (manual international payout)
    const handleMarkAsPaid = async () => {
        if (!markPaidItem || !wiseReference.trim() || !markPaidPassword.trim()) return
        setMarkingPaid(true)
        try {
            await apiClient('/api/admin/payout/mark-paid', {
                method: 'POST',
                body: JSON.stringify({
                    orderId: markPaidItem.order_id,
                    wiseReference: wiseReference.trim(),
                    masterPassword: markPaidPassword,
                }),
            })
            setMarkPaidItem(null)
            setWiseReference('')
            setMarkPaidPassword('')
            setTimeout(fetchQueue, 1000)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Mark as paid failed')
        } finally {
            setMarkingPaid(false)
        }
    }

    const copyToClipboard = (text: string, field: string) => {
        navigator.clipboard.writeText(text)
        setCopiedField(field)
        setTimeout(() => setCopiedField(null), 2000)
    }

    const isInternational = (item: PayoutItem) =>
        item.payout_rail_type === 'WISE_GLOBAL' || (item.settlement_currency && item.settlement_currency !== 'NGN')

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
                    <div key={i} className="animate-pulse bg-platinum-light rounded-2xl h-24 border border-platinum" />
                ))}
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* ── HEADER & SUMMARY CARDS ── */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-navy font-[family-name:var(--font-heading)]">
                        Friday Payout Gate
                    </h2>
                    <p className="text-sm text-platinum-dark mt-1">
                        {queue.length} order{queue.length !== 1 ? 's' : ''} ready for payout
                    </p>
                </div>
                <button
                    onClick={handleRecalculate}
                    disabled={recalculating}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-platinum text-navy rounded-xl 
            hover:bg-platinum-light transition-colors text-sm font-medium disabled:opacity-50 cursor-pointer"
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
                    <p className="text-2xl font-bold text-navy">
                        {(() => {
                            // Group totals by currency for mixed-currency display
                            const byCurrency: Record<string, number> = {}
                            queue.forEach(q => {
                                const cur = q.order_currency || 'NGN'
                                byCurrency[cur] = (byCurrency[cur] || 0) + q.net_payout
                            })
                            return Object.entries(byCurrency)
                                .map(([cur, amt]) => formatCurrency(amt, cur))
                                .join(' + ')
                        })()}
                    </p>
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-50/50 border border-emerald-200 rounded-2xl p-4">
                    <div className="flex items-center gap-2 text-emerald-600 mb-1">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-xs font-medium uppercase tracking-wider">Margin Safe</span>
                    </div>
                    <p className="text-2xl font-bold text-navy">
                        {queue.filter(q => q.margin_status === 'SAFE').length}
                    </p>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-amber-50/50 border border-amber-200 rounded-2xl p-4">
                    <div className="flex items-center gap-2 text-amber-600 mb-1">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-xs font-medium uppercase tracking-wider">FX Drift</span>
                    </div>
                    <p className="text-2xl font-bold text-navy">
                        {queue.filter(q => q.margin_status === 'DRIFT_WARNING').length}
                    </p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-blue-50/50 border border-blue-200 rounded-2xl p-4">
                    <div className="flex items-center gap-2 text-blue-600 mb-1">
                        <Package className="w-4 h-4" />
                        <span className="text-xs font-medium uppercase tracking-wider">Selected</span>
                    </div>
                    <p className="text-2xl font-bold text-navy">{selectedIds.size}</p>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-4 text-sm">
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
                        className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-bold text-emerald-700">Batch Execution Results</h3>
                            <button onClick={() => setBatchResults(null)} className="text-platinum-dark hover:text-navy cursor-pointer">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="space-y-1 text-sm">
                            {batchResults.map(r => (
                                <div key={r.orderId} className="flex items-center gap-2">
                                    {r.status === 'RELEASED' ? (
                                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                                    ) : (
                                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                                    )}
                                    <span className="text-navy font-mono text-xs">{r.orderId.slice(0, 8)}...</span>
                                    <span className={r.status === 'RELEASED' ? 'text-emerald-600' : 'text-amber-600'}>
                                        {r.status}
                                    </span>
                                    {r.error && <span className="text-red-500 text-xs">— {r.error}</span>}
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
                    <div className="flex items-center justify-between bg-white border border-platinum rounded-xl px-4 py-3">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={selectedIds.size === queue.length && queue.length > 0}
                                onChange={toggleAll}
                                className="w-5 h-5 rounded accent-gold cursor-pointer"
                            />
                            <span className="text-sm text-navy font-medium">
                                Select All ({queue.length})
                            </span>
                        </label>
                        {selectedIds.size > 0 && (
                            <div className="flex items-center gap-4 text-sm">
                                <span className="text-platinum-dark">
                                    {selectedIds.size} selected · {(() => {
                                        const byCurrency: Record<string, number> = {}
                                        queue.filter(q => selectedIds.has(q.order_id)).forEach(q => {
                                            const cur = q.order_currency || 'NGN'
                                            byCurrency[cur] = (byCurrency[cur] || 0) + q.net_payout
                                        })
                                        return Object.entries(byCurrency).map(([cur, amt]) => formatCurrency(amt, cur)).join(' + ')
                                    })()} total
                                </span>
                                {selectedDrift > 0 && (
                                    <span className="text-amber-600 flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3" />
                                        {selectedDrift} with FX drift
                                    </span>
                                )}
                                <button
                                    onClick={() => setShowMfaModal(true)}
                                    className="flex items-center gap-2 px-5 py-2 bg-gold text-navy-dark font-bold rounded-full
                    hover:bg-gold-light transition-colors cursor-pointer shadow-sm"
                                >
                                    <Lock className="w-4 h-4" />
                                    Process Batch Payout
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
                                className={`bg-white border rounded-2xl transition-all ${selectedIds.has(item.order_id)
                                    ? 'border-gold/50 bg-gold/5'
                                    : 'border-platinum hover:border-platinum-dark hover:shadow-sm'
                                    } ${item.vendor_flagged ? 'ring-2 ring-red-200' : ''}`}
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
                                            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                                                <CheckCircle className="w-4 h-4 text-emerald-600" />
                                            </div>
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center animate-pulse">
                                                <AlertTriangle className="w-4 h-4 text-amber-600" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Vendor Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-semibold text-navy truncate">{item.vendor_name || 'Unknown Vendor'}</p>
                                            {/* Payout rail badge */}
                                            {isInternational(item) ? (
                                                <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                    <Globe className="w-3 h-3" /> {item.settlement_currency || 'INTL'}
                                                </span>
                                            ) : (
                                                <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">🇳🇬 NGN</span>
                                            )}
                                            {item.vendor_flagged && (
                                                <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full"><Flag className="w-3 h-3 inline-block mr-0.5" /> Flagged</span>
                                            )}
                                            {item.treasury_mode === 'MANUAL_HOLD' && (
                                                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Manual Hold</span>
                                            )}
                                        </div>
                                        <p className="text-xs text-platinum-dark">{item.vendor_email}</p>
                                    </div>

                                    {/* Payout Amount */}
                                    <div className="text-right flex-shrink-0">
                                        <p className="font-bold text-gold text-lg">{formatCurrency(item.net_payout, item.order_currency || 'NGN')}</p>
                                        <p className="text-xs text-platinum-dark">
                                            of {formatCurrency(item.gross_amount, item.order_currency || 'NGN')} gross
                                        </p>
                                    </div>

                                    {/* Waybill Preview */}
                                    {item.waybill_url && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setLightboxUrl(item.waybill_url) }}
                                            className="flex-shrink-0 w-10 h-10 rounded-lg bg-platinum-light border border-platinum 
                        flex items-center justify-center hover:bg-platinum transition-colors cursor-pointer"
                                            title="View waybill"
                                        >
                                            <Eye className="w-4 h-4 text-navy" />
                                        </button>
                                    )}

                                    {/* Expand Toggle */}
                                    <button
                                        onClick={() => setExpandedRow(expandedRow === item.order_id ? null : item.order_id)}
                                        className="flex-shrink-0 text-platinum-dark hover:text-navy transition-colors cursor-pointer"
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
                                            <div className="px-5 pb-4 pt-0 border-t border-platinum mt-0 pt-4 space-y-4">
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                                                    <div>
                                                        <p className="text-platinum-dark">Order ID</p>
                                                        <p className="text-navy font-mono mt-0.5">{item.order_id.slice(0, 12)}...</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-platinum-dark">Delivered</p>
                                                        <p className="text-navy mt-0.5">{item.delivered_at ? formatDate(item.delivered_at) : '—'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-platinum-dark">Auto Release</p>
                                                        <p className="text-navy mt-0.5">{item.auto_release_at ? formatDate(item.auto_release_at) : '—'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-platinum-dark">Payout Rail</p>
                                                        <p className="text-navy mt-0.5">{item.payout_rail_type || 'Not set'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-platinum-dark">KYC Level</p>
                                                        <p className="text-navy mt-0.5">{item.kyc_level || 'NONE'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-platinum-dark">Shipping Type</p>
                                                        <p className="text-navy mt-0.5">{item.shipping_type}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-platinum-dark">Margin Drift</p>
                                                        <p className={`mt-0.5 font-mono ${item.margin_status === 'SAFE' ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                            {(item.margin_drift * 100).toFixed(2)}%
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-platinum-dark">Settlement</p>
                                                        <p className="text-navy mt-0.5">{item.settlement_currency}</p>
                                                    </div>
                                                </div>

                                                {/* ═══ INTERNATIONAL BANK DETAILS (for manual Wise payout) ═══ */}
                                                {isInternational(item) && item.vendor_bank_account && (
                                                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                                        <div className="flex items-center justify-between mb-3">
                                                            <div className="flex items-center gap-2">
                                                                <Globe className="w-4 h-4 text-blue-600" />
                                                                <span className="text-xs font-bold text-blue-800">International Payout — Copy details to Wise Dashboard</span>
                                                            </div>
                                                            <a
                                                                href="https://wise.com/send"
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-center gap-1 text-[10px] text-blue-600 hover:underline"
                                                            >
                                                                Open Wise <ExternalLink className="w-3 h-3" />
                                                            </a>
                                                        </div>
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                                            <div>
                                                                <p className="text-blue-600/70">Account Holder</p>
                                                                <div className="flex items-center gap-1 mt-0.5">
                                                                    <p className="text-navy font-semibold">{item.vendor_account_holder || '—'}</p>
                                                                    {item.vendor_account_holder && (
                                                                        <button onClick={() => copyToClipboard(item.vendor_account_holder!, 'holder')} className="cursor-pointer">
                                                                            {copiedField === 'holder' ? <CheckCircle className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-blue-400" />}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <p className="text-blue-600/70">IBAN / Account No.</p>
                                                                <div className="flex items-center gap-1 mt-0.5">
                                                                    <p className="text-navy font-mono font-semibold">{item.vendor_bank_account}</p>
                                                                    <button onClick={() => copyToClipboard(item.vendor_bank_account!, 'iban')} className="cursor-pointer">
                                                                        {copiedField === 'iban' ? <CheckCircle className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-blue-400" />}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <p className="text-blue-600/70">SWIFT / BIC</p>
                                                                <div className="flex items-center gap-1 mt-0.5">
                                                                    <p className="text-navy font-mono">{item.vendor_bank_code || '—'}</p>
                                                                    {item.vendor_bank_code && item.vendor_bank_code !== 'INTERNATIONAL' && (
                                                                        <button onClick={() => copyToClipboard(item.vendor_bank_code!, 'swift')} className="cursor-pointer">
                                                                            {copiedField === 'swift' ? <CheckCircle className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-blue-400" />}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <p className="text-blue-600/70">Currency</p>
                                                                <p className="text-navy font-bold mt-0.5">{item.settlement_currency}</p>
                                                            </div>
                                                        </div>
                                                        <div className="mt-3 flex items-center justify-between">
                                                            <p className="text-[10px] text-blue-500">Amount to send: <span className="font-bold text-navy">{formatCurrency(item.net_payout, item.order_currency || 'NGN')}</span></p>
                                                            <button
                                                                onClick={() => setMarkPaidItem(item)}
                                                                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg
                                                                    hover:bg-blue-700 transition-colors cursor-pointer shadow-sm"
                                                            >
                                                                <CheckCircle className="w-3.5 h-3.5" />
                                                                Mark as Paid
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
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
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => { setShowMfaModal(false); setMasterPassword('') }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white border border-platinum rounded-2xl p-6 w-full max-w-md shadow-2xl"
                        >
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center">
                                    <Lock className="w-6 h-6 text-gold" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-navy font-[family-name:var(--font-heading)]">
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
                                    <span className="text-navy font-bold">{selectedIds.size}</span>
                                </div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-platinum-dark">Total Payout</span>
                                    <span className="text-gold font-bold">{(() => {
                                        const byCurrency: Record<string, number> = {}
                                        queue.filter(q => selectedIds.has(q.order_id)).forEach(q => {
                                            const cur = q.order_currency || 'NGN'
                                            byCurrency[cur] = (byCurrency[cur] || 0) + q.net_payout
                                        })
                                        return Object.entries(byCurrency).map(([cur, amt]) => formatCurrency(amt, cur)).join(' + ')
                                    })()}</span>
                                </div>
                                {selectedDrift > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-amber-600"><AlertTriangle className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" /> FX Drift Warnings</span>
                                        <span className="text-amber-600 font-bold">{selectedDrift}</span>
                                    </div>
                                )}
                            </div>

                            <input
                                type="password"
                                value={masterPassword}
                                onChange={(e) => setMasterPassword(e.target.value)}
                                placeholder="Enter master password"
                                autoFocus
                                className="w-full px-4 py-3 bg-platinum-light border border-platinum rounded-xl text-navy 
                  placeholder:text-platinum-dark focus:outline-none focus:border-gold/50 focus:ring-2 
                  focus:ring-gold/20 transition-all mb-4"
                                onKeyDown={(e) => e.key === 'Enter' && handleExecuteBatch()}
                            />

                            <div className="flex gap-3">
                                <button
                                    onClick={() => { setShowMfaModal(false); setMasterPassword('') }}
                                    className="flex-1 px-4 py-3 bg-platinum-light text-platinum-dark rounded-xl hover:bg-platinum 
                    transition-colors font-medium cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleExecuteBatch}
                                    disabled={executing || !masterPassword.trim()}
                                    className="flex-1 px-4 py-3 bg-gold text-navy-dark font-bold rounded-full 
                    hover:bg-gold-light transition-colors disabled:opacity-50 cursor-pointer
                    shadow-sm"
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

            {/* ── MARK AS PAID MODAL (International Payouts) ── */}
            <AnimatePresence>
                {markPaidItem && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => { setMarkPaidItem(null); setWiseReference(''); setMarkPaidPassword('') }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white border border-platinum rounded-2xl p-6 w-full max-w-lg shadow-2xl"
                        >
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                                    <Globe className="w-6 h-6 text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-navy font-[family-name:var(--font-heading)]">
                                        Mark International Payout as Paid
                                    </h3>
                                    <p className="text-sm text-platinum-dark">
                                        Confirm you've processed this via the Wise dashboard
                                    </p>
                                </div>
                            </div>

                            {/* Payout details summary */}
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5 text-sm">
                                <div className="flex justify-between mb-2">
                                    <span className="text-platinum-dark">Vendor</span>
                                    <span className="text-navy font-bold">{markPaidItem.vendor_name}</span>
                                </div>
                                <div className="flex justify-between mb-2">
                                    <span className="text-platinum-dark">Amount</span>
                                    <span className="text-blue-700 font-bold">{formatCurrency(markPaidItem.net_payout, markPaidItem.order_currency || 'NGN')}</span>
                                </div>
                                <div className="flex justify-between mb-2">
                                    <span className="text-platinum-dark">Currency</span>
                                    <span className="text-navy font-bold">{markPaidItem.settlement_currency}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-platinum-dark">Account</span>
                                    <span className="text-navy font-mono text-xs">{markPaidItem.vendor_bank_account}</span>
                                </div>
                            </div>

                            {/* Wise reference input */}
                            <div className="mb-4">
                                <label className="text-xs font-medium text-navy block mb-1.5">
                                    Wise Transfer Reference *
                                </label>
                                <input
                                    type="text"
                                    value={wiseReference}
                                    onChange={(e) => setWiseReference(e.target.value)}
                                    placeholder="e.g. TRANSFER-12345678 or T-xxxxxxxx"
                                    className="w-full px-4 py-3 bg-platinum-light border border-platinum rounded-xl text-navy 
                                        placeholder:text-platinum-dark focus:outline-none focus:border-blue-400 focus:ring-2 
                                        focus:ring-blue-100 transition-all font-mono"
                                    autoFocus
                                />
                                <p className="text-[10px] text-platinum-dark mt-1">Copy the transfer ID from the Wise dashboard after processing</p>
                            </div>

                            {/* Master password */}
                            <div className="mb-5">
                                <label className="text-xs font-medium text-navy block mb-1.5">
                                    Master Password *
                                </label>
                                <input
                                    type="password"
                                    value={markPaidPassword}
                                    onChange={(e) => setMarkPaidPassword(e.target.value)}
                                    placeholder="Enter master password"
                                    className="w-full px-4 py-3 bg-platinum-light border border-platinum rounded-xl text-navy 
                                        placeholder:text-platinum-dark focus:outline-none focus:border-gold/50 focus:ring-2 
                                        focus:ring-gold/20 transition-all"
                                    onKeyDown={(e) => e.key === 'Enter' && handleMarkAsPaid()}
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => { setMarkPaidItem(null); setWiseReference(''); setMarkPaidPassword('') }}
                                    className="flex-1 px-4 py-3 bg-platinum-light text-platinum-dark rounded-xl hover:bg-platinum 
                                        transition-colors font-medium cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleMarkAsPaid}
                                    disabled={markingPaid || !wiseReference.trim() || !markPaidPassword.trim()}
                                    className="flex-1 px-4 py-3 bg-blue-600 text-white font-bold rounded-full 
                                        hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
                                >
                                    {markingPaid ? (
                                        <span className="flex items-center gap-2 justify-center">
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                            Processing...
                                        </span>
                                    ) : (
                                        'Confirm Payout Complete'
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
                                className="absolute -top-3 -right-3 w-8 h-8 bg-white border border-platinum 
                  rounded-full flex items-center justify-center text-navy hover:bg-red-50 hover:text-red-500 transition-colors cursor-pointer z-10 shadow-md"
                            >
                                <X className="w-4 h-4" />
                            </button>
                            <img
                                src={lightboxUrl}
                                alt="Waybill proof"
                                className="rounded-2xl max-h-[80vh] object-contain border border-platinum shadow-2xl"
                            />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
