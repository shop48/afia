import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import AppShell from '../../components/layout/AppShell'
import { ArrowLeft, Truck, CheckCircle, CheckCircle2, AlertTriangle, ExternalLink, X, Camera, Loader2, Package, RefreshCcw, HeartCrack, HelpCircle, Radio, Paperclip, Timer } from 'lucide-react'
import { Badge } from '../../components/ui'
import StepTracker from '../../components/ui/StepTracker'
import CountdownTimer from '../../components/logistics/CountdownTimer'
import { useOrders, getProduct, getEscrow, getVendor, getStepFromStatus } from '../../hooks/useOrders'
import { supabase } from '../../lib/supabase'

export default function OrderDetailPage() {
    const { orderId } = useParams<{ orderId: string }>()
    const { profile, signOut } = useAuth()
    const navigate = useNavigate()
    const { currentOrder: order, loading, error, fetchOrderDetail, confirmDelivery, reportDispute } = useOrders()

    const [confirming, setConfirming] = useState(false)
    const [showDisputeForm, setShowDisputeForm] = useState(false)
    const [disputeReason, setDisputeReason] = useState('')
    const [disputeCategory, setDisputeCategory] = useState('')
    const [evidenceFiles, setEvidenceFiles] = useState<File[]>([])
    const [evidencePreviews, setEvidencePreviews] = useState<string[]>([])
    const [uploading, setUploading] = useState(false)
    const [actionError, setActionError] = useState<string | null>(null)
    const [actionSuccess, setActionSuccess] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const DISPUTE_CATEGORIES = [
        { value: 'NOT_RECEIVED', label: 'Not Received', icon: <Package className="w-5 h-5" />, desc: 'I never received the package' },
        { value: 'WRONG_ITEM', label: 'Wrong Item', icon: <RefreshCcw className="w-5 h-5" />, desc: 'Received a different product' },
        { value: 'DAMAGED', label: 'Damaged', icon: <HeartCrack className="w-5 h-5" />, desc: 'Item arrived damaged or defective' },
        { value: 'OTHER', label: 'Other', icon: <HelpCircle className="w-5 h-5" />, desc: 'Another issue not listed above' },
    ]

    useEffect(() => {
        if (orderId) fetchOrderDetail(orderId)
    }, [orderId, fetchOrderDetail])

    // Cleanup evidence previews on unmount
    useEffect(() => {
        return () => evidencePreviews.forEach(url => URL.revokeObjectURL(url))
    }, [evidencePreviews])

    const handleConfirmDelivery = async () => {
        if (!orderId) return
        setConfirming(true)
        setActionError(null)
        try {
            const result = await confirmDelivery(orderId)
            setActionSuccess(result.message)
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Failed to confirm delivery')
        } finally {
            setConfirming(false)
        }
    }

    const handleEvidenceSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        if (files.length + evidenceFiles.length > 5) {
            setActionError('Maximum 5 evidence photos allowed')
            return
        }
        const validFiles = files.filter(f => {
            if (!f.type.startsWith('image/')) { setActionError('Only image files are allowed'); return false }
            if (f.size > 5 * 1024 * 1024) { setActionError('Each file must be under 5MB'); return false }
            return true
        })
        setEvidenceFiles(prev => [...prev, ...validFiles])
        setEvidencePreviews(prev => [...prev, ...validFiles.map(f => URL.createObjectURL(f))])
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const removeEvidence = (index: number) => {
        URL.revokeObjectURL(evidencePreviews[index])
        setEvidenceFiles(prev => prev.filter((_, i) => i !== index))
        setEvidencePreviews(prev => prev.filter((_, i) => i !== index))
    }

    const handleDispute = async () => {
        if (!orderId || !disputeReason.trim() || !disputeCategory) return
        setActionError(null)
        setUploading(true)
        try {
            // Upload evidence photos to Supabase Storage
            const uploadedUrls: string[] = []
            for (const file of evidenceFiles) {
                const ext = file.name.split('.').pop() || 'jpg'
                const path = `disputes/${orderId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
                const { error: uploadError } = await supabase.storage
                    .from('evidence')
                    .upload(path, file, { contentType: file.type })
                if (uploadError) throw new Error(`Failed to upload evidence: ${uploadError.message}`)
                const { data: urlData } = supabase.storage.from('evidence').getPublicUrl(path)
                uploadedUrls.push(urlData.publicUrl)
            }

            const result = await reportDispute(orderId, disputeReason.trim(), disputeCategory, uploadedUrls)
            setActionSuccess(result.message)
            setShowDisputeForm(false)
            setDisputeReason('')
            setDisputeCategory('')
            setEvidenceFiles([])
            setEvidencePreviews([])
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Failed to file dispute')
        } finally {
            setUploading(false)
        }
    }

    const product = order ? getProduct(order) : null
    const escrow = order ? getEscrow(order) : null
    const vendor = order ? getVendor(order) : null
    const currentStep = order ? getStepFromStatus(order.status, (escrow as any)?.status) : 0

    return (
        <AppShell
            role="BUYER"
            activePath="/dashboard"
            userName={profile?.full_name || 'User'}
            onNavigate={(path) => navigate(path)}
            onLogout={signOut}
        >
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                style={{ maxWidth: '48rem', margin: '0 auto' }}
            >
                {/* Back Button */}
                <button
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center gap-1.5 text-gold hover:text-gold-light transition-colors text-sm mb-5 cursor-pointer"
                >
                    <ArrowLeft size={16} /> Back to Orders
                </button>

                {/* Loading / Error */}
                {loading && (
                    <div className="text-center py-12 text-platinum-dark">Loading order...</div>
                )}
                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-4 text-sm border border-red-200">
                        {error}
                    </div>
                )}

                {order && (
                    <>
                        {/* Header */}
                        <div className="flex justify-between items-start mb-6 flex-wrap gap-3">
                            <div>
                                <h1 className="text-xl font-bold text-navy font-[family-name:var(--font-heading)] m-0">
                                    {product?.title || 'Order Details'}
                                </h1>
                                <p className="text-platinum-dark text-sm mt-1">
                                    Order #{order.id.slice(0, 8)} · {new Date(order.created_at).toLocaleDateString()}
                                </p>
                            </div>
                            <Badge
                                variant={
                                    order.status === 'COMPLETED' ? 'released' :
                                        order.status === 'DISPUTED' ? 'disputed' :
                                            order.status === 'DELIVERED' ? 'verified' :
                                                order.status === 'SHIPPED' ? 'locked' : 'pending'
                                }
                            >
                                {order.status}
                            </Badge>
                        </div>

                        {/* Step Tracker */}
                        <div className="bg-white rounded-xl border border-platinum p-5 mb-5">
                            <StepTracker.OrderFlow currentStep={currentStep} />
                        </div>

                        {/* Countdown Timer (when in DELIVERED state) */}
                        {order.status === 'DELIVERED' && order.auto_release_at && (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-5 flex flex-col items-center gap-3">
                                <p className="text-navy text-sm font-medium m-0">
                                    <Timer className="w-4 h-4 inline-block mr-1.5 -mt-0.5" /> Dispute Window Remaining
                                </p>
                                <CountdownTimer
                                    targetDate={order.auto_release_at}
                                    label="Auto-release in"
                                />
                                <p className="text-platinum-dark text-xs text-center m-0">
                                    Funds will be released to the vendor when the timer expires.
                                    If there's an issue, file a dispute before time runs out.
                                </p>
                            </div>
                        )}

                        {/* Action Feedback */}
                        {actionSuccess && (
                            <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-3 rounded-xl mb-4 text-sm">
                                <CheckCircle2 className="w-4 h-4 inline-block mr-1.5 -mt-0.5" /> {actionSuccess}
                            </div>
                        )}
                        {actionError && (
                            <div className="bg-red-50 text-red-600 border border-red-200 px-4 py-3 rounded-xl mb-4 text-sm">
                                {actionError}
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3 mb-6 flex-wrap">
                            {order.status === 'SHIPPED' && (
                                <button
                                    onClick={handleConfirmDelivery}
                                    disabled={confirming}
                                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-neoa-emerald text-white font-semibold cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <CheckCircle size={18} />
                                    {confirming ? 'Confirming...' : 'Confirm Delivery'}
                                </button>
                            )}

                            {order.status === 'DELIVERED' && !order.is_disputed && (
                                <button
                                    onClick={() => setShowDisputeForm(!showDisputeForm)}
                                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-50 text-red-600 border border-red-200 font-semibold cursor-pointer hover:bg-red-100 transition-colors"
                                >
                                    <AlertTriangle size={18} />
                                    Report Issue
                                </button>
                            )}

                            {order.status === 'COMPLETED' && (
                                <div className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-50 text-indigo-600 text-sm font-medium">
                                    <CheckCircle size={18} />
                                    Order Complete — Funds Released ✓
                                </div>
                            )}
                        </div>

                        {/* Dispute Form (Enhanced with categories and evidence) */}
                        <AnimatePresence>
                            {showDisputeForm && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="bg-red-50 border border-red-200 rounded-xl p-5 mb-6 overflow-hidden"
                                >
                                    <h3 className="text-red-700 font-semibold text-base mb-4">
                                        What went wrong?
                                    </h3>

                                    {/* Step 1: Category Selector */}
                                    <div className="mb-4">
                                        <label className="text-navy text-sm font-medium block mb-2">Issue Type *</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {DISPUTE_CATEGORIES.map(cat => (
                                                <button
                                                    key={cat.value}
                                                    onClick={() => setDisputeCategory(cat.value)}
                                                    type="button"
                                                    className={`p-3 rounded-lg border-2 text-left cursor-pointer transition-all ${disputeCategory === cat.value
                                                        ? 'border-red-500 bg-red-100 shadow-sm'
                                                        : 'border-platinum bg-white hover:border-red-300'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-lg">{cat.icon}</span>
                                                        <span className="text-navy text-sm font-semibold">{cat.label}</span>
                                                    </div>
                                                    <p className="text-platinum-dark text-xs mt-1 m-0">{cat.desc}</p>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Step 2: Description */}
                                    <div className="mb-4">
                                        <label className="text-navy text-sm font-medium block mb-2">Description *</label>
                                        <textarea
                                            placeholder="Describe the issue in detail... (minimum 5 characters)"
                                            value={disputeReason}
                                            onChange={e => setDisputeReason(e.target.value)}
                                            maxLength={2000}
                                            rows={4}
                                            className="w-full p-3 bg-white border border-red-200 rounded-lg text-navy text-sm resize-y outline-none focus:border-red-400 transition-colors"
                                        />
                                        <p className="text-platinum-dark text-xs text-right mt-1 m-0">
                                            {disputeReason.length}/2000
                                        </p>
                                    </div>

                                    {/* Step 3: Evidence Upload */}
                                    <div className="mb-4">
                                        <label className="text-navy text-sm font-medium block mb-2">
                                            Evidence Photos (optional, max 5)
                                        </label>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            onChange={handleEvidenceSelect}
                                            className="hidden"
                                        />
                                        <div className="flex flex-wrap gap-2">
                                            {evidencePreviews.map((preview, index) => (
                                                <div key={index} className="relative w-20 h-20 rounded-lg overflow-hidden border border-platinum group">
                                                    <img src={preview} alt={`Evidence ${index + 1}`} className="w-full h-full object-cover" />
                                                    <button
                                                        onClick={() => removeEvidence(index)}
                                                        type="button"
                                                        className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            ))}
                                            {evidenceFiles.length < 5 && (
                                                <button
                                                    onClick={() => fileInputRef.current?.click()}
                                                    type="button"
                                                    className="w-20 h-20 rounded-lg border-2 border-dashed border-red-300 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-red-400 hover:bg-red-100/50 transition-colors"
                                                >
                                                    <Camera size={18} className="text-red-400" />
                                                    <span className="text-[10px] text-red-400 font-medium">Add</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Submit */}
                                    <div className="flex gap-3 mt-4">
                                        <button
                                            onClick={handleDispute}
                                            disabled={disputeReason.trim().length < 5 || !disputeCategory || uploading}
                                            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-red-600 text-white font-semibold cursor-pointer hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {uploading ? (
                                                <><Loader2 size={16} className="animate-spin" /> Uploading...</>
                                            ) : (
                                                <><AlertTriangle size={16} /> Submit Dispute</>
                                            )}
                                        </button>
                                        <button
                                            onClick={() => { setShowDisputeForm(false); setDisputeCategory(''); setDisputeReason(''); setEvidenceFiles([]); setEvidencePreviews(prev => { prev.forEach(url => URL.revokeObjectURL(url)); return [] }) }}
                                            disabled={uploading}
                                            className="px-5 py-2.5 rounded-lg bg-platinum-light text-platinum-dark cursor-pointer hover:bg-platinum transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Disputed Status Banner */}
                        {order.is_disputed && (
                            <motion.div
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-red-50 border border-red-200 rounded-xl p-5 mb-6"
                            >
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="text-red-500 mt-0.5 flex-shrink-0" size={20} />
                                    <div className="flex-1">
                                        <h3 className="text-red-700 font-semibold text-sm m-0">Dispute Filed</h3>
                                        <p className="text-red-600 text-xs mt-1 mb-0">
                                            {order.dispute_category && (
                                                <span className="inline-block px-2 py-0.5 mr-2 rounded-full text-[10px] font-bold bg-red-200 text-red-700">
                                                    {order.dispute_category.replace('_', ' ')}
                                                </span>
                                            )}
                                            {order.disputed_at && `Filed ${new Date(order.disputed_at).toLocaleDateString()}`}
                                        </p>
                                        {order.dispute_reason && (
                                            <p className="text-navy text-sm mt-2 mb-0 bg-white rounded-lg p-3 border border-red-100">
                                                {order.dispute_reason}
                                            </p>
                                        )}
                                        {order.dispute_evidence_urls && order.dispute_evidence_urls.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {order.dispute_evidence_urls.map((url, i) => (
                                                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block w-16 h-16 rounded-lg overflow-hidden border border-red-200 hover:shadow-md transition-shadow">
                                                        <img src={url} alt={`Evidence ${i + 1}`} className="w-full h-full object-cover" />
                                                    </a>
                                                ))}
                                            </div>
                                        )}
                                        <p className="text-platinum-dark text-xs mt-3 mb-0">
                                            Our team is reviewing your dispute. Auto-release has been paused.
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Refunded Status Banner */}
                        {order.status === 'REFUNDED' && (
                            <div className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-50 text-amber-700 text-sm font-medium mb-6">
                                <AlertTriangle size={18} />
                                Dispute resolved — Refund initiated. Funds have been frozen.
                            </div>
                        )}

                        {/* Order Details Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Product Info */}
                            <div className="bg-white rounded-xl border border-platinum p-5">
                                <h3 className="text-xs font-semibold text-platinum-dark uppercase tracking-wider mb-3">
                                    Product
                                </h3>
                                {product?.images?.[0] && (
                                    <img
                                        src={product.images[0]}
                                        alt={product.title}
                                        className="w-full h-40 object-cover rounded-lg mb-3"
                                    />
                                )}
                                <p className="font-semibold text-navy m-0">{product?.title}</p>
                                <p className="text-platinum-dark text-sm mt-1 mb-0">
                                    Qty: {order.quantity} × {order.currency} {product?.base_price?.toLocaleString()}
                                </p>
                                <p className="font-bold text-navy text-lg mt-1 mb-0">
                                    Total: {order.currency} {order.total_amount.toLocaleString()}
                                </p>
                            </div>

                            {/* Shipping Info */}
                            <div className="bg-white rounded-xl border border-platinum p-5">
                                <h3 className="text-xs font-semibold text-platinum-dark uppercase tracking-wider mb-3">
                                    Shipping
                                </h3>
                                {order.shipping_type ? (
                                    <div className="space-y-3">
                                        <div>
                                            <span className="text-platinum-dark text-xs">Method</span>
                                            <p className="text-navy font-medium text-sm mt-0.5 mb-0">
                                                <span className="inline-flex items-center gap-1.5">{order.shipping_type === 'API_AUTOMATED' ? <><Radio className="w-3.5 h-3.5" /> API Tracking</> : <><Paperclip className="w-3.5 h-3.5" /> Manual Waybill</>}</span>
                                            </p>
                                        </div>

                                        {order.tracking_id && (
                                            <div>
                                                <span className="text-platinum-dark text-xs">Tracking ID</span>
                                                <p className="text-indigo-600 font-medium font-mono text-sm mt-0.5 mb-0">
                                                    {order.tracking_id}
                                                </p>
                                            </div>
                                        )}

                                        {order.waybill_url && (
                                            <div>
                                                <span className="text-platinum-dark text-xs">Waybill</span>
                                                <a
                                                    href={order.waybill_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1 text-gold hover:text-gold-light text-sm mt-0.5 transition-colors"
                                                >
                                                    View Waybill <ExternalLink size={14} />
                                                </a>
                                            </div>
                                        )}

                                        {order.courier_phone && (
                                            <div>
                                                <span className="text-platinum-dark text-xs">Courier Phone</span>
                                                <p className="text-navy text-sm mt-0.5 mb-0">{order.courier_phone}</p>
                                            </div>
                                        )}

                                        {order.estimated_delivery_date && (
                                            <div>
                                                <span className="text-platinum-dark text-xs">Est. Delivery</span>
                                                <p className="text-navy text-sm mt-0.5 mb-0">
                                                    {new Date(order.estimated_delivery_date).toLocaleDateString()}
                                                </p>
                                            </div>
                                        )}

                                        {order.shipped_at && (
                                            <div>
                                                <span className="text-platinum-dark text-xs">Shipped At</span>
                                                <p className="text-navy text-sm mt-0.5 mb-0">
                                                    {new Date(order.shipped_at).toLocaleString()}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-2 py-5">
                                        <Truck size={32} className="text-platinum-dark" />
                                        <p className="text-platinum-dark text-sm m-0">
                                            Awaiting vendor fulfillment
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Vendor Info */}
                        {vendor && (
                            <div className="bg-white rounded-xl border border-platinum p-4 mt-4 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                    {vendor.full_name?.[0]?.toUpperCase() || 'V'}
                                </div>
                                <div>
                                    <p className="text-navy font-semibold text-sm m-0">
                                        {vendor.full_name || 'Vendor'}
                                    </p>
                                    <p className="text-platinum-dark text-xs m-0">
                                        KYC: {vendor.kyc_level || 'PENDING'}
                                    </p>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </motion.div>
        </AppShell>
    )
}
