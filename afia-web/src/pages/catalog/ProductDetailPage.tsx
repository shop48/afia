import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useProducts, type Product } from '../../hooks/useProducts'
import { useAuth } from '../../contexts/AuthContext'
import { formatCurrency } from '../../lib/currency'
import { Badge, Skeleton } from '../../components/ui'
import {
    ShieldCheck, BadgeCheck, ArrowLeft, Package,
    ShoppingCart, ChevronLeft, ChevronRight, Minus, Plus, LogIn
} from 'lucide-react'

export default function ProductDetailPage() {
    const { productId } = useParams<{ productId: string }>()
    const navigate = useNavigate()
    const { user, role } = useAuth()
    const { fetchProduct, loading } = useProducts()

    const [product, setProduct] = useState<Product | null>(null)
    const [selectedImage, setSelectedImage] = useState(0)
    const [quantity, setQuantity] = useState(1)
    const [notFound, setNotFound] = useState(false)

    useEffect(() => {
        if (!productId) return
        const load = async () => {
            const p = await fetchProduct(productId)
            if (p) {
                setProduct(p)
            } else {
                setNotFound(true)
            }
        }
        load()
    }, [productId, fetchProduct])

    const isVerified = product?.vendor?.kyc_level === 'VERIFIED'
    const isOutOfStock = product?.stock_count === 0
    const maxQty = Math.min(product?.stock_count || 1, 10)

    // ── Loading State ──
    if (loading && !product) {
        return (
            <div className="min-h-screen bg-platinum-light">
                <div style={{ maxWidth: '1024px', margin: '0 auto', padding: '2rem clamp(2rem, 5vw, 4rem)' }}>
                    <Skeleton className="w-32 h-4 mb-8" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <Skeleton className="w-full aspect-square rounded-xl" />
                        <div className="space-y-4">
                            <Skeleton className="w-3/4 h-8" />
                            <Skeleton className="w-1/3 h-6" />
                            <Skeleton className="w-full h-24" />
                            <Skeleton className="w-48 h-12" />
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // ── Not Found ──
    if (notFound) {
        return (
            <div className="min-h-screen bg-platinum-light flex items-center justify-center">
                <div className="text-center">
                    <div className="w-20 h-20 rounded-2xl bg-platinum-light flex items-center justify-center mx-auto mb-5">
                        <Package className="w-10 h-10 text-platinum-dark" />
                    </div>
                    <h2 className="text-xl font-bold text-navy font-[family-name:var(--font-heading)] mb-2">
                        Product Not Found
                    </h2>
                    <p className="text-platinum-dark text-sm mb-6">
                        This product may have been removed or is no longer available.
                    </p>
                    <button
                        onClick={() => navigate('/catalog')}
                        className="px-6 py-2.5 bg-gold text-navy-dark font-semibold rounded-full cursor-pointer hover:bg-gold-light transition-colors"
                    >
                        ← Back to Catalog
                    </button>
                </div>
            </div>
        )
    }

    if (!product) return null

    return (
        <div className="min-h-screen bg-platinum-light">
            {/* ══════ TOP BAR ══════ */}
            <div className="bg-white border-b border-platinum">
                <div style={{ maxWidth: '1024px', margin: '0 auto', padding: '0.75rem clamp(2rem, 5vw, 4rem)' }} className="flex items-center justify-between">
                    <button
                        onClick={() => navigate('/catalog')}
                        className="flex items-center gap-2 text-sm text-navy hover:text-gold transition-colors cursor-pointer"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Catalog
                    </button>
                    <span className="font-[family-name:var(--font-heading)] text-lg font-bold">
                        <span className="text-gold">N</span>eoa
                    </span>
                </div>
            </div>

            {/* ══════ PRODUCT CONTENT ══════ */}
            <div style={{ maxWidth: '1024px', margin: '0 auto', padding: '2rem clamp(2rem, 5vw, 4rem)' }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
                    {/* LEFT: Image Gallery */}
                    <motion.div
                        initial={{ opacity: 0, x: -15 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4 }}
                    >
                        {/* Main Image */}
                        <div className="aspect-square rounded-2xl overflow-hidden bg-white border border-platinum relative">
                            {product.images.length > 0 ? (
                                <img
                                    src={product.images[selectedImage]}
                                    alt={product.title}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <Package className="w-16 h-16 text-platinum-dark" />
                                </div>
                            )}

                            {/* Image navigation arrows */}
                            {product.images.length > 1 && (
                                <>
                                    <button
                                        onClick={() => setSelectedImage(i => i > 0 ? i - 1 : product.images.length - 1)}
                                        className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm
                                            flex items-center justify-center cursor-pointer hover:bg-white shadow-md transition-colors"
                                    >
                                        <ChevronLeft className="w-5 h-5 text-navy" />
                                    </button>
                                    <button
                                        onClick={() => setSelectedImage(i => i < product.images.length - 1 ? i + 1 : 0)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm
                                            flex items-center justify-center cursor-pointer hover:bg-white shadow-md transition-colors"
                                    >
                                        <ChevronRight className="w-5 h-5 text-navy" />
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Thumbnails */}
                        {product.images.length > 1 && (
                            <div className="flex gap-2 mt-3">
                                {product.images.map((url, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setSelectedImage(i)}
                                        className={`w-16 h-16 rounded-lg overflow-hidden border-2 cursor-pointer transition-all
                                            ${selectedImage === i
                                                ? 'border-gold ring-2 ring-gold/20'
                                                : 'border-platinum hover:border-gold/50'
                                            }`}
                                    >
                                        <img src={url} alt={`View ${i + 1}`} className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </motion.div>

                    {/* RIGHT: Product Info */}
                    <motion.div
                        initial={{ opacity: 0, x: 15 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                        className="space-y-6"
                    >
                        {/* Category + Title */}
                        <div>
                            {product.category && (
                                <Badge variant="default">
                                    {product.category}
                                </Badge>
                            )}
                            <h1 className="text-2xl sm:text-3xl font-bold text-navy font-[family-name:var(--font-heading)] mt-2">
                                {product.title}
                            </h1>
                        </div>

                        {/* Price */}
                        <div className="bg-white rounded-xl border border-platinum p-5">
                            <p className="text-3xl font-bold text-navy">
                                {formatCurrency(product.base_price, product.currency)}
                            </p>
                            <p className="text-[11px] text-platinum-dark mt-2">
                                Escrow-protected • 15% platform fee for buyer protection
                            </p>
                        </div>

                        {/* Description */}
                        {product.description && (
                            <div>
                                <h3 className="text-sm font-semibold text-navy mb-2">Description</h3>
                                <p className="text-sm text-navy/80 leading-relaxed whitespace-pre-wrap">
                                    {product.description}
                                </p>
                            </div>
                        )}

                        {/* Stock & Quantity */}
                        <div className="bg-white rounded-xl border border-platinum p-5">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-sm font-medium text-navy">Availability</span>
                                {isOutOfStock ? (
                                    <span className="text-sm font-bold text-ruby">Out of Stock</span>
                                ) : (
                                    <span className="text-sm text-neoa-emerald font-medium">
                                        {product.stock_count} in stock
                                    </span>
                                )}
                            </div>

                            {!isOutOfStock && (
                                <div className="flex items-center gap-4 mb-4">
                                    <span className="text-sm text-navy">Quantity:</span>
                                    <div className="flex items-center border border-platinum rounded-lg overflow-hidden">
                                        <button
                                            onClick={() => setQuantity(q => Math.max(1, q - 1))}
                                            disabled={quantity <= 1}
                                            className="w-10 h-10 flex items-center justify-center hover:bg-platinum-light transition-colors
                                                cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            <Minus className="w-4 h-4" />
                                        </button>
                                        <span className="w-12 text-center font-semibold text-navy">{quantity}</span>
                                        <button
                                            onClick={() => setQuantity(q => Math.min(maxQty, q + 1))}
                                            disabled={quantity >= maxQty}
                                            className="w-10 h-10 flex items-center justify-center hover:bg-platinum-light transition-colors
                                                cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Buy Now Button */}
                            {user && role === 'BUYER' ? (
                                <button
                                    onClick={() => navigate(`/checkout/${product.id}?qty=${quantity}`)}
                                    disabled={isOutOfStock}
                                    className="w-full py-3.5 bg-gold text-navy-dark font-bold rounded-full flex items-center justify-center gap-2
                                        hover:bg-gold-light transition-colors cursor-pointer shadow-sm
                                        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gold"
                                >
                                    <ShoppingCart className="w-5 h-5" />
                                    {isOutOfStock ? 'Out of Stock' : 'Buy Now — Escrow Protected'}
                                </button>
                            ) : user && role === 'VENDOR' ? (
                                <div className="w-full py-3.5 bg-platinum-light text-platinum-dark font-medium rounded-full flex items-center justify-center gap-2 text-sm">
                                    <Package className="w-4 h-4" />
                                    Vendors cannot purchase products
                                </div>
                            ) : (
                                <button
                                    onClick={() => navigate('/login')}
                                    disabled={isOutOfStock}
                                    className="w-full py-3.5 bg-gold text-navy-dark font-bold rounded-full flex items-center justify-center gap-2
                                        hover:bg-gold-light transition-colors cursor-pointer shadow-sm
                                        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gold"
                                >
                                    <LogIn className="w-5 h-5" />
                                    {isOutOfStock ? 'Out of Stock' : 'Sign In to Buy'}
                                </button>
                            )}
                            <p className="text-[11px] text-center text-platinum-dark mt-2">
                                Funds held safely in escrow until you confirm delivery
                            </p>
                        </div>

                        {/* Vendor Info */}
                        <div className="bg-white rounded-xl border border-platinum p-5">
                            <h3 className="text-sm font-semibold text-navy mb-3">Sold by</h3>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center text-gold font-bold">
                                    {product.vendor?.full_name?.charAt(0) || 'V'}
                                </div>
                                <div>
                                    <p className="font-medium text-navy text-sm">
                                        {product.vendor?.full_name || 'Vendor'}
                                    </p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        {isVerified && (
                                            <span className="flex items-center gap-1 text-[11px] text-neoa-emerald font-medium">
                                                <BadgeCheck className="w-3.5 h-3.5" />
                                                Verified by SmileID
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Trust Section */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex items-center gap-2.5 p-3 bg-neoa-emerald/5 rounded-xl">
                                <ShieldCheck className="w-5 h-5 text-neoa-emerald shrink-0" />
                                <div>
                                    <p className="text-[11px] font-semibold text-navy">Escrow Protected</p>
                                    <p className="text-[10px] text-platinum-dark">Funds locked until delivery</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2.5 p-3 bg-gold/5 rounded-xl">
                                <BadgeCheck className="w-5 h-5 text-gold shrink-0" />
                                <div>
                                    <p className="text-[11px] font-semibold text-navy">48h Dispute Window</p>
                                    <p className="text-[10px] text-platinum-dark">Full refund guarantee</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    )
}
