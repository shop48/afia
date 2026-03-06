import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Radio, Paperclip, Send, Loader2 } from 'lucide-react'

type Rail = 'rail1' | 'rail2'

interface FulfillmentModalProps {
    orderId: string
    productTitle: string
    isOpen: boolean
    onClose: () => void
    onSubmit: (orderId: string, rail: Rail, data: Record<string, string>) => Promise<void>
}

const CARRIERS = ['DHL', 'GIG Logistics', 'FedEx', 'UPS', 'Kwik Delivery', 'Sendbox', 'Other']

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

    const reset = () => {
        setRail(null)
        setTrackingId('')
        setCarrier('')
        setWaybillUrl('')
        setCourierPhone('')
        setEstimatedDeliveryDate('')
        setError(null)
    }

    const handleClose = () => {
        reset()
        onClose()
    }

    const handleSubmit = async () => {
        if (!rail) return
        setError(null)

        // Validate before entering async flow
        if (rail === 'rail1') {
            if (!trackingId.trim()) {
                setError('Please enter a tracking ID')
                return
            }
        } else {
            if (!waybillUrl.trim()) {
                setError('Please upload or paste the waybill image URL')
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
            <motion.div
                className="fulfillment-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={handleClose}
            >
                <motion.div
                    className="fulfillment-modal"
                    initial={{ opacity: 0, y: 30, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 30, scale: 0.97 }}
                    transition={{ duration: 0.25 }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="fm-header">
                        <div>
                            <h2 className="fm-title">Fulfill Order</h2>
                            <p className="fm-subtitle">{productTitle}</p>
                        </div>
                        <button className="fm-close" onClick={handleClose} aria-label="Close">✕</button>
                    </div>

                    {/* Step 1: Choose Rail */}
                    {!rail && (
                        <div className="fm-body">
                            <p className="fm-prompt">How will you ship this order?</p>
                            <div className="fm-rail-options">
                                <button className="fm-rail-card" onClick={() => setRail('rail1')}>
                                    <span className="fm-rail-icon"><Radio className="w-8 h-8" /></span>
                                    <span className="fm-rail-label">API Tracking</span>
                                    <span className="fm-rail-desc">Enter a carrier & tracking ID</span>
                                </button>
                                <button className="fm-rail-card" onClick={() => setRail('rail2')}>
                                    <span className="fm-rail-icon"><Paperclip className="w-8 h-8" /></span>
                                    <span className="fm-rail-label">Manual Waybill</span>
                                    <span className="fm-rail-desc">Upload waybill photo + courier details</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 2a: Rail 1 Form */}
                    {rail === 'rail1' && (
                        <div className="fm-body">
                            <button className="fm-back" onClick={() => setRail(null)}>← Change method</button>
                            <div className="fm-field">
                                <label>Carrier</label>
                                <select value={carrier} onChange={e => setCarrier(e.target.value)}>
                                    <option value="">Select carrier (optional)</option>
                                    {CARRIERS.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="fm-field">
                                <label>Tracking ID <span className="required">*</span></label>
                                <input
                                    type="text"
                                    placeholder="e.g. DHL0042398901"
                                    value={trackingId}
                                    onChange={e => setTrackingId(e.target.value)}
                                    maxLength={100}
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 2b: Rail 2 Form */}
                    {rail === 'rail2' && (
                        <div className="fm-body">
                            <button className="fm-back" onClick={() => setRail(null)}>← Change method</button>
                            <div className="fm-field">
                                <label>Waybill Photo URL <span className="required">*</span></label>
                                <input
                                    type="url"
                                    placeholder="https://... (paste URL after uploading)"
                                    value={waybillUrl}
                                    onChange={e => setWaybillUrl(e.target.value)}
                                />
                                <span className="fm-hint">Upload your waybill to Supabase Storage or paste an image URL</span>
                            </div>
                            <div className="fm-field">
                                <label>Courier Phone <span className="required">*</span></label>
                                <input
                                    type="tel"
                                    placeholder="e.g. +234 801 234 5678"
                                    value={courierPhone}
                                    onChange={e => setCourierPhone(e.target.value)}
                                />
                            </div>
                            <div className="fm-field">
                                <label>Estimated Delivery Date <span className="required">*</span></label>
                                <input
                                    type="date"
                                    min={minDate}
                                    value={estimatedDeliveryDate}
                                    onChange={e => setEstimatedDeliveryDate(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {/* Error + Submit */}
                    {rail && (
                        <div className="fm-footer">
                            {error && <p className="fm-error">{error}</p>}
                            <button
                                className="fm-submit"
                                onClick={handleSubmit}
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <span className="fm-spinner"><Loader2 className="w-5 h-5 animate-spin" /></span>
                                ) : (
                                    <span className="inline-flex items-center gap-2">Ship Order <Send className="w-4 h-4" /></span>
                                )}
                            </button>
                        </div>
                    )}

                    <style>{`
                        .fulfillment-overlay {
                            position: fixed;
                            inset: 0;
                            background: rgba(0,0,0,0.6);
                            backdrop-filter: blur(4px);
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            z-index: 1000;
                            padding: 16px;
                        }
                        .fulfillment-modal {
                            background: #1a1a2e;
                            border: 1px solid rgba(255,255,255,0.08);
                            border-radius: 16px;
                            width: 100%;
                            max-width: 480px;
                            overflow: hidden;
                            box-shadow: 0 24px 48px rgba(0,0,0,0.4);
                        }
                        .fm-header {
                            display: flex;
                            justify-content: space-between;
                            align-items: flex-start;
                            padding: 20px 24px 16px;
                            border-bottom: 1px solid rgba(255,255,255,0.06);
                        }
                        .fm-title {
                            margin: 0;
                            font-size: 1.25rem;
                            font-weight: 700;
                            color: #f9fafb;
                        }
                        .fm-subtitle {
                            margin: 4px 0 0;
                            font-size: 0.85rem;
                            color: #9ca3af;
                        }
                        .fm-close {
                            background: none;
                            border: none;
                            color: #6b7280;
                            font-size: 1.25rem;
                            cursor: pointer;
                            padding: 4px;
                            line-height: 1;
                        }
                        .fm-close:hover { color: #f9fafb; }
                        .fm-body {
                            padding: 20px 24px;
                        }
                        .fm-prompt {
                            margin: 0 0 16px;
                            color: #d1d5db;
                            font-size: 0.95rem;
                        }
                        .fm-rail-options {
                            display: grid;
                            grid-template-columns: 1fr 1fr;
                            gap: 12px;
                        }
                        .fm-rail-card {
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            gap: 8px;
                            padding: 20px 16px;
                            background: rgba(255,255,255,0.04);
                            border: 1px solid rgba(255,255,255,0.08);
                            border-radius: 12px;
                            cursor: pointer;
                            transition: all 0.2s;
                            color: #f9fafb;
                        }
                        .fm-rail-card:hover {
                            background: rgba(99,102,241,0.15);
                            border-color: rgba(99,102,241,0.4);
                            transform: translateY(-2px);
                        }
                        .fm-rail-icon { font-size: 2rem; }
                        .fm-rail-label { font-weight: 600; font-size: 0.95rem; }
                        .fm-rail-desc {
                            font-size: 0.75rem;
                            color: #9ca3af;
                            text-align: center;
                        }
                        .fm-back {
                            background: none;
                            border: none;
                            color: #818cf8;
                            cursor: pointer;
                            font-size: 0.85rem;
                            padding: 0;
                            margin-bottom: 16px;
                        }
                        .fm-back:hover { color: #a5b4fc; }
                        .fm-field {
                            margin-bottom: 16px;
                        }
                        .fm-field label {
                            display: block;
                            font-size: 0.85rem;
                            font-weight: 500;
                            color: #d1d5db;
                            margin-bottom: 6px;
                        }
                        .required { color: #ef4444; }
                        .fm-field input,
                        .fm-field select {
                            width: 100%;
                            padding: 10px 14px;
                            background: rgba(255,255,255,0.05);
                            border: 1px solid rgba(255,255,255,0.1);
                            border-radius: 8px;
                            color: #f9fafb;
                            font-size: 0.9rem;
                            outline: none;
                            transition: border-color 0.2s;
                            box-sizing: border-box;
                        }
                        .fm-field input:focus,
                        .fm-field select:focus {
                            border-color: #818cf8;
                        }
                        .fm-hint {
                            font-size: 0.75rem;
                            color: #6b7280;
                            margin-top: 4px;
                            display: block;
                        }
                        .fm-footer {
                            padding: 16px 24px 20px;
                            border-top: 1px solid rgba(255,255,255,0.06);
                        }
                        .fm-error {
                            background: rgba(239,68,68,0.15);
                            color: #fca5a5;
                            padding: 8px 12px;
                            border-radius: 8px;
                            font-size: 0.85rem;
                            margin: 0 0 12px;
                        }
                        .fm-submit {
                            width: 100%;
                            padding: 12px;
                            background: linear-gradient(135deg, #6366f1, #8b5cf6);
                            color: #fff;
                            border: none;
                            border-radius: 10px;
                            font-size: 1rem;
                            font-weight: 600;
                            cursor: pointer;
                            transition: all 0.2s;
                        }
                        .fm-submit:hover:not(:disabled) {
                            transform: translateY(-1px);
                            box-shadow: 0 4px 16px rgba(99,102,241,0.4);
                        }
                        .fm-submit:disabled {
                            opacity: 0.6;
                            cursor: not-allowed;
                        }
                        .fm-spinner {
                            display: inline-block;
                            animation: spin 1s linear infinite;
                        }
                        @keyframes spin { to { transform: rotate(360deg); } }
                    `}</style>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}
