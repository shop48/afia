import { useState, useEffect, useCallback } from 'react'
import { Modal, Button, Input } from '../ui'
import ImageUploader from './ImageUploader'
import { PRODUCT_CATEGORIES, type ProductFormData, type Product } from '../../hooks/useProducts'
import { getSupportedCurrencies } from '../../lib/currency'
import { Package } from 'lucide-react'

interface ProductFormModalProps {
    open: boolean
    onClose: () => void
    onSubmit: (data: ProductFormData) => Promise<void>
    product?: Product | null  // If provided, it's edit mode
    submitting?: boolean
}

const CURRENCIES = getSupportedCurrencies()

const EMPTY_FORM: ProductFormData = {
    title: '',
    description: '',
    category: '',
    base_price: 0,
    currency: 'USD',
    stock_count: 1,
    images: [],
}

export default function ProductFormModal({ open, onClose, onSubmit, product, submitting = false }: ProductFormModalProps) {
    const [form, setForm] = useState<ProductFormData>(EMPTY_FORM)
    const [errors, setErrors] = useState<Record<string, string>>({})

    const isEdit = !!product

    // Populate form when editing
    useEffect(() => {
        if (product) {
            setForm({
                title: product.title,
                description: product.description || '',
                category: product.category || '',
                base_price: product.base_price,
                currency: product.currency,
                stock_count: product.stock_count,
                images: product.images || [],
            })
        } else {
            setForm(EMPTY_FORM)
        }
        setErrors({})
    }, [product, open])

    const updateField = useCallback(<K extends keyof ProductFormData>(key: K, value: ProductFormData[K]) => {
        setForm(prev => ({ ...prev, [key]: value }))
        setErrors(prev => {
            const next = { ...prev }
            delete next[key]
            return next
        })
    }, [])

    const validate = useCallback((): boolean => {
        const newErrors: Record<string, string> = {}

        if (!form.title.trim()) {
            newErrors.title = 'Product title is required'
        } else if (form.title.trim().length < 3) {
            newErrors.title = 'Title must be at least 3 characters'
        }

        if (form.base_price <= 0) {
            newErrors.base_price = 'Price must be greater than 0'
        }

        if (form.stock_count < 0) {
            newErrors.stock_count = 'Stock cannot be negative'
        }

        if (form.images.length === 0) {
            newErrors.images = 'At least one product image is required'
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }, [form])

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault()
        if (!validate()) return
        await onSubmit(form)
    }, [form, validate, onSubmit])

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={isEdit ? 'Edit Product' : 'Add New Product'}
            size="lg"
        >
            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Title */}
                <Input
                    label="Product Title"
                    placeholder="e.g., Handwoven Kente Cloth"
                    value={form.title}
                    onChange={(e) => updateField('title', e.target.value)}
                    error={errors.title}
                    icon={<Package className="w-4 h-4" />}
                />

                {/* Description */}
                <div>
                    <label className="block text-sm font-medium text-navy mb-1.5">
                        Description
                        <span className="text-xs text-platinum-dark ml-2 font-normal">
                            {form.description.length}/5000
                        </span>
                    </label>
                    <textarea
                        rows={3}
                        maxLength={5000}
                        placeholder="Describe your product in detail..."
                        value={form.description}
                        onChange={(e) => updateField('description', e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-platinum-dark text-sm
                            font-[family-name:var(--font-body)] placeholder:text-platinum-dark
                            focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all duration-150 resize-none"
                    />
                </div>

                {/* Category */}
                <div>
                    <label className="block text-sm font-medium text-navy mb-1.5">Category</label>
                    <select
                        value={form.category}
                        onChange={(e) => updateField('category', e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-platinum-dark text-sm
                            font-[family-name:var(--font-body)] bg-white
                            focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all duration-150"
                    >
                        <option value="">Select a category</option>
                        {PRODUCT_CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>

                {/* Price + Currency Row */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Input
                            label="Base Price"
                            type="number"
                            min="0.01"
                            step="0.01"
                            placeholder="0.00"
                            value={form.base_price || ''}
                            onChange={(e) => updateField('base_price', parseFloat(e.target.value) || 0)}
                            error={errors.base_price}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-navy mb-1.5">Currency</label>
                        <select
                            value={form.currency}
                            onChange={(e) => updateField('currency', e.target.value)}
                            className="w-full px-4 py-2.5 rounded-lg border border-platinum-dark text-sm
                                font-[family-name:var(--font-body)] bg-white
                                focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all duration-150"
                        >
                            {CURRENCIES.map(c => (
                                <option key={c.code} value={c.code}>
                                    {c.symbol} {c.code} — {c.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Stock Count */}
                <Input
                    label="Stock Count"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    value={form.stock_count}
                    onChange={(e) => updateField('stock_count', parseInt(e.target.value) || 0)}
                    error={errors.stock_count}
                />

                {/* Images */}
                <div>
                    <ImageUploader
                        images={form.images}
                        onChange={(imgs) => updateField('images', imgs)}
                        disabled={submitting}
                    />
                    {errors.images && (
                        <p className="text-xs text-ruby mt-1">{errors.images}</p>
                    )}
                </div>

                {/* Form Actions */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-platinum">
                    <Button
                        variant="ghost"
                        type="button"
                        onClick={onClose}
                        disabled={submitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        type="submit"
                        loading={submitting}
                    >
                        {isEdit ? 'Save Changes' : 'Create Product'}
                    </Button>
                </div>
            </form>
        </Modal>
    )
}
