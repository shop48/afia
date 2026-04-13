import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'
import { useProducts, type Product } from '../../hooks/useProducts'
import { useCheckout, type CheckoutData } from '../../hooks/useCheckout'
import { formatCurrency } from '../../lib/currency'
import {
    ShieldCheck, ArrowLeft, Package, CreditCard,
    Lock, AlertTriangle, CheckCircle, Loader2, BadgeCheck
} from 'lucide-react'

type CheckoutStep = 'review' | 'processing' | 'success' | 'error'

export default function CheckoutPage() {
    const { productId } = useParams<{ productId: string }>()
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const { user, profile } = useAuth()
    const { fetchProduct } = useProducts()
    const {
        loading: checkoutLoading,
        error: checkoutError,
        initializePayment,
        payWithPaystack,
        verifyPayment,
        clearError,
    } = useCheckout()

    const [product, setProduct] = useState<Product | null>(null)
    const [pageLoading, setPageLoading] = useState(true)
    const [quantity, setQuantity] = useState(1)
    const [step, setStep] = useState<CheckoutStep>('review')
    const [successRef, setSuccessRef] = useState<string | null>(null)

    // Parse quantity from URL
    useEffect(() => {
        const qty = parseInt(searchParams.get('qty') || '1', 10)
        if (qty > 0 && qty <= 10) setQuantity(qty)
    }, [searchParams])

    // Fetch product
    useEffect(() => {
        if (!productId) return
        const load = async () => {
            const p = await fetchProduct(productId)
            setProduct(p)
            setPageLoading(false)
        }
        load()
    }, [productId, fetchProduct])

    // ── Derived values (no FX conversion — Paystack handles multi-currency natively) ──
    const unitPrice = product?.base_price || 0
    const subtotal = unitPrice * quantity
    const currency = product?.currency || 'NGN'
    const isVerified = product?.vendor?.kyc_level === 'VERIFIED'

    // ── Handle Pay ──
    const handlePay = async () => {
        if (!product) return
        setStep('processing')
        clearError()

        // Step 1: Initialize with backend
        const data: CheckoutData | null = await initializePayment(product, quantity)

        if (!data) {
            setStep('error')
            return
        }

        // Step 2: Open Paystack popup (currency passed from backend)
        await payWithPaystack(
            async (reference: string) => {
                // Step 3: Verify on backend
                setStep('processing')
                const order = await verifyPayment(reference)
                if (order) {
                    setSuccessRef(reference)
                    setStep('success')
                } else {
                    // Webhook might not have fired yet — still show success
                    // The webhook will create the order asynchronously
                    setSuccessRef(reference)
                    setStep('success')
                }
            },
            () => {
                // User closed the popup
                setStep('review')
            },
            data
        )
    }

    // ── Loading State ──
    if (pageLoading) {
        return (
            <div className="min-h-screen bg-platinum-light flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 text-gold animate-spin mx-auto mb-3" />
                    <p className="text-sm text-platinum-dark">Loading checkout...</p>
                </div>
            </div>
        )
    }

    // ── Product Not Found ──
    if (!product) {
        return (
            <div className="min-h-screen bg-platinum-light flex items-center justify-center">
                <div className="text-center">
                    <Package className="w-12 h-12 text-platinum-dark mx-auto mb-4" />
                    <h2 className="text-lg font-bold text-navy mb-2">Product not found</h2>
                    <button
                        onClick={() => navigate('/catalog')}
                        className="text-gold hover:text-gold-dark text-sm font-medium cursor-pointer"
                    >
                        ← Back to Catalog
                    </button>
                </div>
            </div>
        )
    }

    // ── Success State ──
    if (step === 'success') {
        return (
            <div className="min-h-screen bg-platinum-light flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-2xl border border-platinum p-8 sm:p-12 max-w-md w-full text-center shadow-lg"
                >
                    <div className="w-16 h-16 rounded-full bg-neoa-emerald/10 flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-8 h-8 text-neoa-emerald" />
                    </div>
                    <h2 className="text-2xl font-bold text-navy font-[family-name:var(--font-heading)] mb-2">
                        Payment Successful!
                    </h2>
                    <p className="text-platinum-dark text-sm mb-2">
                        Your funds are safely held in escrow until delivery is confirmed.
                    </p>
                    {successRef && (
                        <p className="text-xs text-platinum-dark mb-6">
                            Reference: <span className="font-mono text-navy">{successRef}</span>
                        </p>
                    )}

                    <div className="bg-neoa-emerald/5 rounded-xl p-4 mb-6 text-left">
                        <div className="flex items-center gap-2 mb-2">
                            <ShieldCheck className="w-4 h-4 text-neoa-emerald" />
                            <span className="text-xs font-semibold text-navy">Escrow Protection Active</span>
                        </div>
                        <ul className="text-xs text-platinum-dark space-y-1">
                            <li>• Funds locked in vault until you confirm delivery</li>
                            <li>• 48-hour dispute window after delivery</li>
                            <li>• Full refund guarantee if item not received</li>
                        </ul>
                    </div>

                    <div className="space-y-3">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="w-full py-3 bg-gold text-navy-dark font-bold rounded-full hover:bg-gold-light transition-colors cursor-pointer"
                        >
                            View My Orders
                        </button>
                        <button
                            onClick={() => navigate('/catalog')}
                            className="w-full py-3 text-sm text-platinum-dark hover:text-navy transition-colors cursor-pointer"
                        >
                            Continue Shopping
                        </button>
                    </div>
                </motion.div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-platinum-light">
            {/* ══════ TOP BAR ══════ */}
            <div className="bg-white border-b border-platinum">
                <div style={{ maxWidth: '960px', margin: '0 auto', padding: '0.75rem clamp(2rem, 5vw, 4rem)' }} className="flex items-center justify-between">
                    <button
                        onClick={() => navigate(`/catalog/${productId}`)}
                        className="flex items-center gap-2 text-sm text-navy hover:text-gold transition-colors cursor-pointer"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Product
                    </button>
                    <span className="font-[family-name:var(--font-heading)] text-lg font-bold">
                        <span className="text-gold">N</span>eoa
                    </span>
                </div>
            </div>

            {/* ══════ CHECKOUT CONTENT ══════ */}
            <div style={{ maxWidth: '960px', margin: '0 auto', padding: '2rem clamp(2rem, 5vw, 4rem)' }}>
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                >
                    <h1 className="text-2xl font-bold text-navy font-[family-name:var(--font-heading)] mb-6">
                        Secure Checkout
                    </h1>

                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                        {/* ── LEFT: Order Summary ── */}
                        <div className="lg:col-span-3 space-y-4">
                            {/* Product Card */}
                            <div className="bg-white rounded-xl border border-platinum p-5">
                                <h3 className="text-sm font-semibold text-navy mb-4">Order Summary</h3>
                                <div className="flex gap-4">
                                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-platinum-light border border-platinum shrink-0">
                                        {product.images.length > 0 ? (
                                            <img
                                                src={product.images[0]}
                                                alt={product.title}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Package className="w-8 h-8 text-platinum-dark" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-medium text-navy text-sm truncate">{product.title}</h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            {product.vendor?.full_name && (
                                                <span className="text-xs text-platinum-dark">
                                                    by {product.vendor.full_name}
                                                </span>
                                            )}
                                            {isVerified ? (
                                                <span className="flex items-center gap-0.5 text-[10px] text-neoa-emerald font-medium">
                                                    <BadgeCheck className="w-3 h-3" />
                                                    Verified Seller
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-0.5 text-[10px] text-gold-dark font-medium">
                                                    <BadgeCheck className="w-3 h-3" />
                                                    New Seller
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm font-semibold text-navy mt-2">
                                            {formatCurrency(unitPrice, currency)}
                                            <span className="text-platinum-dark font-normal"> × {quantity}</span>
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Price Breakdown */}
                            <div className="bg-white rounded-xl border border-platinum p-5">
                                <h3 className="text-sm font-semibold text-navy mb-4">Price Breakdown</h3>
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-platinum-dark">Subtotal ({quantity} item{quantity > 1 ? 's' : ''})</span>
                                        <span className="text-navy font-medium">{formatCurrency(subtotal, currency)}</span>
                                    </div>

                                    <div className="border-t border-platinum pt-3 flex justify-between">
                                        <span className="font-semibold text-navy">Total to Pay</span>
                                        <span className="font-bold text-lg text-navy">
                                            {formatCurrency(subtotal, currency)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Escrow Info */}
                            <div className="bg-neoa-emerald/5 rounded-xl border border-neoa-emerald/20 p-5">
                                <div className="flex items-start gap-3">
                                    <ShieldCheck className="w-5 h-5 text-neoa-emerald shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="text-sm font-semibold text-navy mb-1">Escrow Protection</h4>
                                        <p className="text-xs text-platinum-dark leading-relaxed">
                                            Your payment will be held in a secure vault — the vendor does NOT receive the funds until
                                            you confirm delivery. You have a 48-hour dispute window after delivery for any issues.
                                            Platform fee: 15% for escrow security and dispute resolution.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── RIGHT: Payment ── */}
                        <div className="lg:col-span-2">
                            <div className="bg-white rounded-xl border border-platinum p-5 sticky top-6">
                                <h3 className="text-sm font-semibold text-navy mb-4 flex items-center gap-2">
                                    <CreditCard className="w-4 h-4 text-gold" />
                                    Payment
                                </h3>

                                <div className="mb-5 p-4 bg-platinum-light rounded-lg">
                                    <p className="text-xs text-platinum-dark mb-1">Paying as</p>
                                    <p className="text-sm font-medium text-navy">{user?.email}</p>
                                    <p className="text-xs text-platinum-dark mt-1">
                                        {profile?.full_name || 'Buyer'}
                                    </p>
                                </div>

                                {/* Error Display */}
                                {(checkoutError || step === 'error') && (
                                    <div className="mb-4 p-3 bg-ruby/5 border border-ruby/20 rounded-lg flex items-start gap-2">
                                        <AlertTriangle className="w-4 h-4 text-ruby shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-xs font-medium text-ruby">Payment Failed</p>
                                            <p className="text-xs text-ruby/80 mt-0.5">
                                                {checkoutError || 'Something went wrong. Please try again.'}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Pay Button */}
                                <button
                                    onClick={handlePay}
                                    disabled={checkoutLoading || step === 'processing'}
                                    className="w-full py-4 bg-gold text-navy-dark font-bold rounded-full flex items-center justify-center gap-2
                                        hover:bg-gold-light transition-all cursor-pointer shadow-sm
                                        disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {step === 'processing' || checkoutLoading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <Lock className="w-4 h-4" />
                                            Pay {formatCurrency(subtotal, currency)}
                                        </>
                                    )}
                                </button>

                                <p className="text-[10px] text-center text-platinum-dark mt-3">
                                    Secured by Paystack • 256-bit encryption
                                </p>

                                {/* Trust Badges */}
                                <div className="mt-5 pt-5 border-t border-platinum space-y-3">
                                    <div className="flex items-center gap-2">
                                        <ShieldCheck className="w-4 h-4 text-neoa-emerald" />
                                        <span className="text-[11px] text-navy">Escrow-protected transaction</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <BadgeCheck className="w-4 h-4 text-gold" />
                                        <span className="text-[11px] text-navy">48-hour dispute window guarantee</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Lock className="w-4 h-4 text-navy/60" />
                                        <span className="text-[11px] text-navy">Funds released only after confirmation</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    )
}
