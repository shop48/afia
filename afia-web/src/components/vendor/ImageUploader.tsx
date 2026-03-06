import { useCallback, useRef, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, X, ImagePlus, Loader2 } from 'lucide-react'
import { useImageUpload, type UploadResult } from '../../hooks/useImageUpload'

interface ImageUploaderProps {
    images: string[]
    onChange: (images: string[]) => void
    maxImages?: number
    disabled?: boolean
}

export default function ImageUploader({ images, onChange, maxImages = 5, disabled = false }: ImageUploaderProps) {
    const { uploading, progress, error, uploadImage, getPathFromUrl, deleteImage } = useImageUpload()
    const [dragOver, setDragOver] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    // Track latest images via ref to avoid stale closure in sequential uploads
    const imagesRef = useRef(images)
    useEffect(() => { imagesRef.current = images }, [images])

    const handleFiles = useCallback(async (files: FileList | File[]) => {
        const fileArray = Array.from(files)
        const remaining = maxImages - imagesRef.current.length
        const toUpload = fileArray.slice(0, remaining)

        for (const file of toUpload) {
            const result: UploadResult | null = await uploadImage(file)
            if (result) {
                const updated = [...imagesRef.current, result.url]
                imagesRef.current = updated
                onChange(updated)
            }
        }
    }, [maxImages, onChange, uploadImage])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setDragOver(false)
        if (!disabled && e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files)
        }
    }, [disabled, handleFiles])

    const handleRemove = useCallback(async (index: number) => {
        const url = images[index]
        const path = getPathFromUrl(url)
        if (path) {
            await deleteImage(path)
        }
        const updated = images.filter((_, i) => i !== index)
        onChange(updated)
    }, [images, onChange, deleteImage, getPathFromUrl])

    const canAdd = images.length < maxImages && !disabled

    return (
        <div className="space-y-3">
            <label className="block text-sm font-medium text-navy mb-1.5">
                Product Images ({images.length}/{maxImages})
            </label>

            {/* Image thumbnails */}
            <div className="grid grid-cols-5 gap-2">
                <AnimatePresence>
                    {images.map((url, i) => (
                        <motion.div
                            key={url}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="relative aspect-square rounded-lg overflow-hidden border border-platinum bg-platinum-light group"
                        >
                            <img
                                src={url}
                                alt={`Product ${i + 1}`}
                                className="w-full h-full object-cover"
                            />
                            {!disabled && (
                                <button
                                    type="button"
                                    onClick={() => handleRemove(i)}
                                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-navy/70 text-white flex items-center justify-center
                                        opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-ruby"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                            {i === 0 && (
                                <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-gold text-navy-dark text-[9px] font-bold rounded-md uppercase">
                                    Cover
                                </span>
                            )}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Drop zone */}
            {canAdd && (
                <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`
                        relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer
                        transition-all duration-200
                        ${dragOver
                            ? 'border-gold bg-gold/5 scale-[1.01]'
                            : 'border-platinum-dark hover:border-gold/50 hover:bg-platinum-light/50'
                        }
                        ${uploading ? 'pointer-events-none opacity-70' : ''}
                    `}
                >
                    {uploading ? (
                        <div className="flex flex-col items-center gap-2">
                            <Loader2 className="w-8 h-8 text-gold animate-spin" />
                            <p className="text-sm text-platinum-dark">Uploading... {progress}%</p>
                            <div className="w-32 h-1.5 bg-platinum rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-gold rounded-full"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    transition={{ duration: 0.3 }}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-2">
                            {dragOver ? (
                                <ImagePlus className="w-8 h-8 text-gold" />
                            ) : (
                                <Upload className="w-8 h-8 text-platinum-dark" />
                            )}
                            <div>
                                <p className="text-sm font-medium text-navy">
                                    {dragOver ? 'Drop images here' : 'Click or drag images'}
                                </p>
                                <p className="text-xs text-platinum-dark mt-0.5">
                                    JPEG, PNG or WebP • Max 5MB each
                                </p>
                            </div>
                        </div>
                    )}

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                            if (e.target.files) handleFiles(e.target.files)
                            e.target.value = ''
                        }}
                    />
                </div>
            )}

            {/* Error message */}
            {error && (
                <p className="text-xs text-ruby mt-1">{error}</p>
            )}
        </div>
    )
}
