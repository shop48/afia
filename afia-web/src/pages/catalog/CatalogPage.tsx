import { useState, useEffect, useCallback, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useProducts, PRODUCT_CATEGORIES, type Product } from '../../hooks/useProducts'
import { formatCurrency, getConvertedDisplay } from '../../lib/currency'
import { Skeleton } from '../../components/ui'
import { useAuth } from '../../contexts/AuthContext'
import AppShell from '../../components/layout/AppShell'
import {
    Search, ShieldCheck, BadgeCheck, Package, SlidersHorizontal, X,
    Monitor, Shirt, Sparkles, Home, UtensilsCrossed, Palette, Gem, Dumbbell, BookOpen
} from 'lucide-react'

export default function CatalogPage() {
    const navigate = useNavigate()
    const { user, profile, role, signOut } = useAuth()
    const { products, loading, fetchProducts } = useProducts()

    const [search, setSearch] = useState('')
    const [category, setCategory] = useState('')
    const [showFilters, setShowFilters] = useState(false)
    const [debouncedSearch, setDebouncedSearch] = useState('')

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 350)
        return () => clearTimeout(timer)
    }, [search])

    // Fetch products whenever filters change
    useEffect(() => {
        fetchProducts({
            search: debouncedSearch || undefined,
            category: category || undefined,
            limit: 50,
        })
    }, [fetchProducts, debouncedSearch, category])

    const clearFilters = useCallback(() => {
        setSearch('')
        setCategory('')
    }, [])

    const hasFilters = search || category

    // Category icon map — Lucide SVG icons for consistent cross-platform rendering
    const categoryIcons: Record<string, ReactNode> = {
        'Electronics': <Monitor className="w-4 h-4" />,
        'Fashion & Apparel': <Shirt className="w-4 h-4" />,
        'Beauty & Health': <Sparkles className="w-4 h-4" />,
        'Home & Garden': <Home className="w-4 h-4" />,
        'Food & Beverages': <UtensilsCrossed className="w-4 h-4" />,
        'Art & Crafts': <Palette className="w-4 h-4" />,
        'Jewelry & Accessories': <Gem className="w-4 h-4" />,
        'Sports & Outdoors': <Dumbbell className="w-4 h-4" />,
        'Books & Media': <BookOpen className="w-4 h-4" />,
        'Other': <Package className="w-4 h-4" />,
    }

    // The catalog content (shared between auth'd and guest views)
    const catalogContent = (
        <div className={user ? '' : 'min-h-screen bg-platinum-light'}>
            {/* ══════ HERO HEADER ══════ */}
            <div className="bg-navy text-white" style={user ? { margin: 'calc(-1 * clamp(1rem, 3vw, 2.5rem))' } : undefined}>
                <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '3rem clamp(2rem, 5vw, 4rem)' }}>
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <div className="flex items-center gap-2 mb-4">
                            <span className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">
                                <span className="text-gold">N</span>eoa
                            </span>
                            <span className="text-white/40">•</span>
                            <span className="text-white/60 text-sm">Marketplace</span>
                        </div>
                        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-[family-name:var(--font-heading)] mb-4">
                            Discover Global Products
                        </h1>
                        <p className="text-white/60 text-base sm:text-lg max-w-xl leading-relaxed">
                            Every transaction is escrow-protected — your money stays safe until you confirm delivery.
                        </p>

                        {/* Search Bar */}
                        <div className="mt-8 flex gap-3">
                            <div className="relative flex-1 max-w-lg">
                                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                                <input
                                    type="text"
                                    placeholder="Search products..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full pl-13 pr-5 py-4 bg-white/10 border border-white/20 rounded-full
                                        text-white placeholder:text-white/40 text-sm
                                        focus:bg-white/15 focus:border-gold/50 focus:outline-none focus:ring-2 focus:ring-gold/20
                                        transition-all duration-200"
                                />
                            </div>
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`px - 5 py - 4 rounded - full border text - sm font - medium flex items - center gap - 2 cursor - pointer transition - all duration - 200
                                    ${showFilters || category
                                        ? 'bg-gold/20 border-gold/50 text-gold shadow-lg shadow-gold/10'
                                        : 'bg-white/10 border-white/20 text-white/70 hover:bg-white/15'
                                    } `}
                            >
                                <SlidersHorizontal className="w-4 h-4" />
                                <span className="hidden sm:inline">Filters</span>
                            </button>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* ══════ CATEGORY FILTER BAR ══════ */}
            {showFilters && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                    className="bg-white border-b border-platinum shadow-sm"
                >
                    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '1.25rem clamp(2rem, 5vw, 4rem)' }}>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-semibold text-navy">Browse by Category</span>
                            {hasFilters && (
                                <button
                                    onClick={clearFilters}
                                    className="px-4 py-1.5 rounded-full text-xs font-semibold text-ruby bg-ruby/5 hover:bg-ruby/10 border border-ruby/10 transition-all cursor-pointer flex items-center gap-1.5"
                                >
                                    <X className="w-3 h-3" />
                                    Clear filters
                                </button>
                            )}
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                            {PRODUCT_CATEGORIES.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setCategory(category === cat ? '' : cat)}
                                    className={`flex items - center gap - 2 px - 4 py - 2.5 rounded - full text - sm font - medium whitespace - nowrap
transition - all duration - 200 cursor - pointer border shrink - 0
                                        ${category === cat
                                            ? 'bg-gold text-navy-dark border-gold shadow-md shadow-gold/20 scale-[1.02]'
                                            : 'bg-platinum-light/60 text-navy border-platinum hover:bg-platinum hover:border-platinum-dark hover:shadow-sm'
                                        } `}
                                >
                                    <span className="flex items-center justify-center w-5 h-5 opacity-80">{categoryIcons[cat] || <Package className="w-4 h-4" />}</span>
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>
                </motion.div>
            )}

            {/* ══════ PRODUCTS GRID ══════ */}
            <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2.5rem clamp(2rem, 5vw, 4rem)' }}>
                {/* Result count */}
                <div className="flex items-center justify-between mb-6">
                    <p className="text-sm text-platinum-dark">
                        {loading ? 'Loading...' : `${products.length} product${products.length !== 1 ? 's' : ''} found`}
                    </p>
                    {/* Trust banner */}
                    <div className="hidden sm:flex items-center gap-2 text-xs text-neoa-emerald bg-neoa-emerald/5 px-3 py-1.5 rounded-lg">
                        <ShieldCheck className="w-4 h-4" />
                        All transactions escrow-protected
                    </div>
                </div>

                {/* Loading Skeleton */}
                {loading && products.length === 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="bg-white rounded-xl border border-platinum overflow-hidden">
                                <Skeleton className="w-full aspect-square !rounded-none" />
                                <div className="p-4 space-y-2">
                                    <Skeleton className="w-3/4 h-4" />
                                    <Skeleton className="w-1/3 h-5" />
                                    <Skeleton className="w-1/2 h-3" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Empty State */}
                {!loading && products.length === 0 && (
                    <div className="text-center py-20">
                        <div className="w-20 h-20 rounded-2xl bg-platinum-light flex items-center justify-center mx-auto mb-5">
                            <Package className="w-10 h-10 text-platinum-dark" />
                        </div>
                        <h3 className="text-lg font-semibold text-navy font-[family-name:var(--font-heading)] mb-2">
                            {hasFilters ? 'No products match your search' : 'No products available'}
                        </h3>
                        <p className="text-platinum-dark text-sm max-w-sm mx-auto">
                            {hasFilters
                                ? 'Try adjusting your filters or search terms.'
                                : 'Products from verified vendors will appear here.'}
                        </p>
                        {hasFilters && (
                            <button
                                onClick={clearFilters}
                                className="mt-4 px-5 py-2 text-sm font-medium text-gold hover:text-gold-dark cursor-pointer"
                            >
                                Clear all filters
                            </button>
                        )}
                    </div>
                )}

                {/* Product Cards */}
                {products.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                        {products.map((product, i) => (
                            <ProductCard
                                key={product.id}
                                product={product}
                                index={i}
                                onClick={() => navigate(`/ catalog / ${product.id} `)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )

    // If user is logged in, wrap catalog in AppShell so sidebar stays
    if (user) {
        return (
            <AppShell
                role={role as any}
                activePath="/catalog"
                userName={profile?.full_name || 'User'}
                onNavigate={(path) => navigate(path)}
                onLogout={signOut}
            >
                {catalogContent}
            </AppShell>
        )
    }

    // Guest view — public layout with Sign In footer
    return (
        <div className="min-h-screen bg-platinum-light">
            {catalogContent}

            {/* ══════ NAVIGATION BAR ══════ */}
            <div className="bg-white border-t border-platinum py-4">
                <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 clamp(2rem, 5vw, 4rem)' }} className="flex items-center justify-between">
                    <button
                        onClick={() => navigate('/login')}
                        className="text-sm text-navy hover:text-gold transition-colors cursor-pointer"
                    >
                        ← Sign In
                    </button>
                    <p className="text-xs text-platinum-dark">
                        Powered by <span className="font-[family-name:var(--font-heading)] font-bold"><span className="text-gold">N</span>eoa</span> Escrow
                    </p>
                </div>
            </div>
        </div>
    )
}

// ════════════════════════════════════════════
// PRODUCT CARD (internal component)
// ════════════════════════════════════════════

function ProductCard({ product, index, onClick }: { product: Product; index: number; onClick: () => void }) {
    const isVerified = product.vendor?.kyc_level === 'VERIFIED'
    const isOutOfStock = product.stock_count === 0

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04, duration: 0.3 }}
            onClick={onClick}
            className="bg-white rounded-xl border border-platinum overflow-hidden cursor-pointer group
                hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
        >
            {/* Image */}
            <div className="aspect-square relative bg-platinum-light overflow-hidden">
                {product.images.length > 0 ? (
                    <img
                        src={product.images[0]}
                        alt={product.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-10 h-10 text-platinum-dark" />
                    </div>
                )}

                {/* Badges */}
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                    {isOutOfStock && (
                        <span className="px-2 py-0.5 bg-ruby text-white text-[10px] font-bold rounded-md">
                            Out of Stock
                        </span>
                    )}
                </div>

                {/* Trust badges */}
                <div className="absolute bottom-2 left-2 right-2 flex gap-1.5">
                    <span className="px-2 py-0.5 bg-navy/60 backdrop-blur-sm text-white text-[10px] font-medium rounded-md flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> Escrow
                    </span>
                    {isVerified && (
                        <span className="px-2 py-0.5 bg-neoa-emerald/80 backdrop-blur-sm text-white text-[10px] font-medium rounded-md flex items-center gap-1">
                            <BadgeCheck className="w-3 h-3" /> Verified
                        </span>
                    )}
                </div>
            </div>

            {/* Info */}
            <div className="p-3 sm:p-4">
                <h3 className="font-semibold text-navy text-sm truncate mb-1">
                    {product.title}
                </h3>
                <p className="text-base font-bold text-navy">
                    {formatCurrency(product.base_price, product.currency)}
                </p>
                {product.currency !== 'USD' && (
                    <p className="text-[11px] text-platinum-dark mt-0.5">
                        {getConvertedDisplay(product.base_price, product.currency, 'USD')}
                    </p>
                )}
                {product.currency === 'USD' && (
                    <p className="text-[11px] text-platinum-dark mt-0.5">
                        {getConvertedDisplay(product.base_price, product.currency, 'NGN')}
                    </p>
                )}
                {product.vendor?.full_name && (
                    <p className="text-[11px] text-platinum-dark mt-1.5 truncate">
                        by {product.vendor.full_name}
                    </p>
                )}
            </div>
        </motion.div>
    )
}
