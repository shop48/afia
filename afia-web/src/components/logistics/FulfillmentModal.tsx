import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Radio, Paperclip, Send, Loader2, ChevronDown, Check, X } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

type Rail = 'rail1' | 'rail2'

interface FulfillmentModalProps {
    orderId: string
    productTitle: string
    isOpen: boolean
    onClose: () => void
    onSubmit: (orderId: string, rail: Rail, data: Record<string, string>) => Promise<void>
}

const CARRIERS = ['DHL', 'GIG Logistics', 'FedEx', 'UPS', 'Kwik Delivery', 'Sendbox', 'Other']

// ═══════════════════════════════════════════
// Custom Dropdown (dark‑theme compatible)
// ═══════════════════════════════════════════
function CarrierDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
        }
        if (open) document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [open])

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg
                    bg-white/5 border border-white/10 text-white/90 text-sm
                    hover:border-indigo-400/40 focus:border-indigo-400 focus:outline-none
                    transition-colors cursor-pointer"
            >
                <span className={value ? 'text-white' : 'text-white/40'}>
                    {value || 'Select carrier (optional)'}
                </span>
                <ChevronDown className={`w-4 h-4 text-white/50 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                        className="absolute z-50 top-full left-0 right-0 mt-1.5
                            bg-[#1e1e3a] border border-white/10 rounded-xl shadow-2xl
                            overflow-hidden max-h-[220px] overflow-y-auto"
                    >
                        {/* Empty option */}
                        <button
                            type="button"
                            onClick={() => { onChange(''); setOpen(false) }}
                            className={`w-full flex items-center justify-between px-3.5 py-2.5 text-sm text-left
                                cursor-pointer transition-colors
                                ${!value ? 'bg-indigo-500/15 text-indigo-300' : 'text-white/50 hover:bg-white/5'}`}
                        >
                            <span>None</span>
                            {!value && <Check className="w-3.5 h-3.5" />}
                        </button>

                        {CARRIERS.map(c => (
                            <button
                                key={c}
                                type="button"
                                onClick={() => { onChange(c); setOpen(false) }}
                                className={`w-full flex items-center justify-between px-3.5 py-2.5 text-sm text-left
                                    cursor-pointer transition-colors border-t border-white/5
                                    ${value === c
                                        ? 'bg-indigo-500/15 text-indigo-300 font-medium'
                                        : 'text-white/80 hover:bg-white/5 hover:text-white'
                                    }`}
                            >
                                <span>{c}</span>
                                {value === c && <Check className="w-3.5 h-3.5" />}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

// ═══════════════════════════════════════════
// FULFILLMENT MODAL
// ═══════════════════════════════════════════
export default function FulfillmentModal({ orderId, productTitle, isOpen, onClose, onSubmit }: FulfillmentModalProps) {
    const [rail, setRail] = useState<Rail | null>(null)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Rail 1 fields
    const [trackingId, setTrackingId] = useState('')
    const [carrier, setCarrier] = useState('')

    // Rail 2 fields
    const [waybillUrl, setWaybillUrl] = useState('')
    const [courierPhone, setCourierPhone] = useState('')
    const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState('')

    // Waybill file upload — via backend API (no client-side RLS needed)
    const { session } = useAuth()
    const waybillInputRef = useRef<HTMLInputElement>(null)
    const [dragOver, setDragOver] = useState(false)
    const [waybillUploading, setWaybillUploading] = useState(false)
    const [waybillProgress, setWaybillProgress] = useState(0)
    const [waybillUploadError, setWaybillUploadError] = useState<string | null>(null)

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787'

    const handleWaybillUpload = useCallback(async (file: File) => {
        if (!session?.access_token) return

        // Client-side validation
        const allowed = ['image/jpeg', 'image/png', 'image/webp']
        if (!allowed.includes(file.type)) {
            setWaybillUploadError('Only JPEG, PNG, and WebP images are allowed')
            return
        }
        if (file.size > 5 * 1024 * 1024) {
            setWaybillUploadError('File too large. Maximum size is 5MB.')
            return
        }

        setWaybillUploading(true)
        setWaybillUploadError(null)
        setWaybillProgress(0)

        // Progress simulation
        const progressInterval = setInterval(() => {
            setWaybillProgress(prev => Math.min(prev + 15, 90))
        }, 200)

        try {
            const formData = new FormData()
            formData.append('file', file)

            const res = await fetch(`${API_URL}/api/upload/waybill`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${session.access_token}` },
                body: formData,
            })

            clearInterval(progressInterval)

            if (!res.ok) {
                const err = await res.json() as { error: string }
                throw new Error(err.error || 'Upload failed')
            }

            const data = await res.json() as { url: string; path: string }
            setWaybillProgress(100)
            setWaybillUrl(data.url)
        } catch (err) {
            clearInterval(progressInterval)
            setWaybillUploadError(err instanceof Error ? err.message : 'Upload failed')
        } finally {
            setWaybillUploading(false)
            setTimeout(() => setWaybillProgress(0), 500)
        }
    }, [session, API_URL])

    const handleWaybillDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setDragOver(false)
        if (e.dataTransfer.files.length > 0) {
            handleWaybillUpload(e.dataTransfer.files[0])
        }
    }, [handleWaybillUpload])

    const handleWaybillFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleWaybillUpload(e.target.files[0])
            e.target.value = ''
        }
    }, [handleWaybillUpload])

    const reset = () => {
        setRail(null)
        setTrackingId('')
        setCarrier('')
        setWaybillUrl('')
        setCourierPhone('')
        setEstimatedDeliveryDate('')
        setError(null)
        setDragOver(false)
    }

    const handleClose = () => {
        reset()
        onClose()
    }

    const handleSubmit = async () => {
        if (!rail) return
        setError(null)

        if (rail === 'rail1') {
            if (!trackingId.trim()) {
                setError('Please enter a tracking ID')
                return
            }
        } else {
            if (!waybillUrl.trim()) {
                setError('Please upload a waybill photo')
                return
            }
            if (!courierPhone.trim()) {
                setError('Please enter the courier\'s phone number')
                return
            }
            if (!estimatedDeliveryDate) {
                setError('Please select an estimated delivery date')
                return
            }
        }

        setSubmitting(true)
        try {
            if (rail === 'rail1') {
                await onSubmit(orderId, 'rail1', { trackingId: trackingId.trim(), carrier })
            } else {
                await onSubmit(orderId, 'rail2', {
                    waybillUrl: waybillUrl.trim(),
                    courierPhone: courierPhone.trim(),
                    estimatedDeliveryDate,
                })
            }
            handleClose()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fulfill order')
        } finally {
            setSubmitting(false)
        }
    }

    if (!isOpen) return null

    // Min date for EDD = tomorrow
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const minDate = tomorrow.toISOString().split('T')[0]

    return (
        <AnimatePresence>
            {/* Backdrop */}
            <motion.div
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

                {/* Modal */}
                <motion.div
                    className="relative bg-[#1a1a2e] border border-white/8 rounded-2xl w-full max-w-[480px] shadow-2xl overflow-hidden"
                    initial={{ opacity: 0, y: 30, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 30, scale: 0.97 }}
                    transition={{ duration: 0.25 }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-white/6">
                        <div>
                            <h2 className="text-xl font-bold text-white m-0">Fulfill Order</h2>
                            <p className="text-sm text-white/50 mt-1 m-0">{productTitle}</p>
                        </div>
                        <button
                            onClick={handleClose}
                            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Step 1: Choose Rail */}
                    {!rail && (
                        <div className="px-6 py-5">
                            <p className="text-white/70 text-sm mb-4 m-0">How will you ship this order?</p>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setRail('rail1')}
                                    className="flex flex-col items-center gap-2 p-5 rounded-xl
                                        bg-white/4 border border-white/8 text-white
                                        hover:bg-indigo-500/15 hover:border-indigo-400/40
                                        hover:-translate-y-0.5 transition-all cursor-pointer"
                                >
                                    <Radio className="w-8 h-8 text-indigo-400" />
                                    <span className="font-semibold text-sm">API Tracking</span>
                                    <span className="text-xs text-white/40 text-center">Enter a carrier & tracking ID</span>
                                </button>
                                <button
                                    onClick={() => setRail('rail2')}
                                    className="flex flex-col items-center gap-2 p-5 rounded-xl
                                        bg-white/4 border border-white/8 text-white
                                        hover:bg-indigo-500/15 hover:border-indigo-400/40
                                        hover:-translate-y-0.5 transition-all cursor-pointer"
                                >
                                    <Paperclip className="w-8 h-8 text-indigo-400" />
                                    <span className="font-semibold text-sm">Manual Waybill</span>
                                    <span className="text-xs text-white/40 text-center">Upload waybill photo + courier details</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 2a: Rail 1 — API Tracking Form */}
                    {rail === 'rail1' && (
                        <div className="px-6 py-5">
                            <button
                                onClick={() => setRail(null)}
                                className="text-indigo-400 text-sm hover:text-indigo-300 transition-colors cursor-pointer mb-4 bg-transparent border-none p-0"
                            >
                                ← Change method
                            </button>

                            {/* Carrier — custom dropdown */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-white/70 mb-1.5">Carrier</label>
                                <CarrierDropdown value={carrier} onChange={setCarrier} />
                            </div>

                            {/* Tracking ID */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-white/70 mb-1.5">
                                    Tracking ID <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. DHL0042398901"
                                    value={trackingId}
                                    onChange={e => setTrackingId(e.target.value)}
                                    maxLength={100}
                                    className="w-full px-3.5 py-2.5 rounded-lg bg-white/5 border border-white/10
                                        text-white text-sm placeholder:text-white/30
                                        focus:border-indigo-400 focus:outline-none transition-colors"
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 2b: Rail 2 — Manual Waybill Form */}
                    {rail === 'rail2' && (
                        <div className="px-6 py-5">
                            <button
                                onClick={() => setRail(null)}
                                className="text-indigo-400 text-sm hover:text-indigo-300 transition-colors cursor-pointer mb-4 bg-transparent border-none p-0"
                            >
                                ← Change method
                            </button>

                            {/* Waybill Photo Upload */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-white/70 mb-1.5">
                                    Waybill Photo <span className="text-red-400">*</span>
                                </label>

                                {waybillUrl ? (
                                    /* ── Preview uploaded image ── */
                                    <div className="relative rounded-lg overflow-hidden border border-white/10 bg-white/5">
                                        <img
                                            src={waybillUrl}
                                            alt="Waybill"
                                            className="w-full h-40 object-contain bg-black/20"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setWaybillUrl('')}
                                            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500/80 text-white
                                                flex items-center justify-center cursor-pointer hover:bg-red-500 transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                        <div className="px-3 py-2 bg-emerald-500/10 border-t border-white/5 flex items-center gap-2">
                                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                                            <span className="text-xs text-emerald-300">Waybill uploaded successfully</span>
                                        </div>
                                    </div>
                                ) : waybillUploading ? (
                                    /* ── Uploading state ── */
                                    <div className="flex flex-col items-center gap-2 p-6 rounded-lg border-2 border-dashed border-indigo-400/40 bg-indigo-500/5">
                                        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                                        <p className="text-sm text-white/60">Uploading waybill...</p>
                                        <div className="w-32 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                            <motion.div
                                                className="h-full bg-indigo-400 rounded-full"
                                                initial={{ width: 0 }}
                                                animate={{ width: `${waybillProgress}%` }}
                                                transition={{ duration: 0.3 }}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    /* ── Drop zone / file picker ── */
                                    <div
                                        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                                        onDragLeave={() => setDragOver(false)}
                                        onDrop={handleWaybillDrop}
                                        onClick={() => waybillInputRef.current?.click()}
                                        className={`flex flex-col items-center gap-2 p-6 rounded-lg border-2 border-dashed
                                            cursor-pointer transition-all duration-200
                                            ${dragOver
                                                ? 'border-indigo-400 bg-indigo-500/10 scale-[1.01]'
                                                : 'border-white/15 hover:border-indigo-400/40 hover:bg-white/3'
                                            }`}
                                    >
                                        <Paperclip className={`w-8 h-8 ${dragOver ? 'text-indigo-400' : 'text-white/30'}`} />
                                        <div className="text-center">
                                            <p className="text-sm font-medium text-white/80">
                                                {dragOver ? 'Drop your waybill here' : 'Click or drag waybill photo'}
                                            </p>
                                            <p className="text-xs text-white/30 mt-0.5">
                                                JPEG, PNG or WebP • Max 5MB
                                            </p>
                                        </div>
                                        <input
                                            ref={waybillInputRef}
                                            type="file"
                                            accept="image/jpeg,image/png,image/webp"
                                            className="hidden"
                                            onChange={handleWaybillFileSelect}
                                        />
                                    </div>
                                )}

                                {waybillUploadError && (
                                    <p className="text-xs text-red-400 mt-1.5">{waybillUploadError}</p>
                                )}
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-white/70 mb-1.5">
                                    Courier Phone <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="tel"
                                    placeholder="e.g. +234 801 234 5678"
                                    value={courierPhone}
                                    onChange={e => setCourierPhone(e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-lg bg-white/5 border border-white/10
                                        text-white text-sm placeholder:text-white/30
                                        focus:border-indigo-400 focus:outline-none transition-colors"
                                />
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-white/70 mb-1.5">
                                    Estimated Delivery Date <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="date"
                                    min={minDate}
                                    value={estimatedDeliveryDate}
                                    onChange={e => setEstimatedDeliveryDate(e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-lg bg-white/5 border border-white/10
                                        text-white text-sm
                                        focus:border-indigo-400 focus:outline-none transition-colors
                                        [color-scheme:dark]"
                                />
                            </div>
                        </div>
                    )}

                    {/* Error + Submit */}
                    {rail && (
                        <div className="px-6 pb-5 pt-3 border-t border-white/6">
                            {error && (
                                <div className="bg-red-500/15 text-red-300 px-3 py-2 rounded-lg text-sm mb-3">
                                    {error}
                                </div>
                            )}
                            <button
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="w-full py-3 rounded-xl font-semibold text-white text-base
                                    bg-gradient-to-r from-indigo-500 to-violet-500
                                    hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/30
                                    disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0
                                    transition-all cursor-pointer flex items-center justify-center gap-2"
                            >
                                {submitting ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>Ship Order <Send className="w-4 h-4" /></>
                                )}
                            </button>
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}
