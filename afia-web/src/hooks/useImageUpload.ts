import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const BUCKET = 'product-images'
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export interface UploadResult {
    path: string
    url: string
}

export function useImageUpload() {
    const { user } = useAuth()
    const [uploading, setUploading] = useState(false)
    const [progress, setProgress] = useState(0)
    const [error, setError] = useState<string | null>(null)

    // ── Validate file before upload ──
    const validateFile = useCallback((file: File): string | null => {
        if (!ALLOWED_TYPES.includes(file.type)) {
            return 'Only JPEG, PNG, and WebP images are allowed'
        }
        if (file.size > MAX_FILE_SIZE) {
            return `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`
        }
        return null
    }, [])

    // ── Upload a single image ──
    const uploadImage = useCallback(async (file: File): Promise<UploadResult | null> => {
        if (!user) {
            setError('Not authenticated')
            return null
        }

        const validationError = validateFile(file)
        if (validationError) {
            setError(validationError)
            return null
        }

        setUploading(true)
        setError(null)
        setProgress(0)

        try {
            // Generate unique path: {vendor_id}/{uuid}.{ext}
            const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
            const fileName = `${crypto.randomUUID()}.${ext}`
            const filePath = `${user.id}/${fileName}`

            // Simulate progress (Supabase JS doesn't expose upload progress)
            const progressInterval = setInterval(() => {
                setProgress(prev => Math.min(prev + 15, 90))
            }, 200)

            const { error: uploadError } = await supabase.storage
                .from(BUCKET)
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false,
                })

            clearInterval(progressInterval)

            if (uploadError) {
                setError(uploadError.message)
                setProgress(0)
                return null
            }

            // Get public URL
            const { data: urlData } = supabase.storage
                .from(BUCKET)
                .getPublicUrl(filePath)

            setProgress(100)

            return {
                path: filePath,
                url: urlData.publicUrl,
            }
        } catch {
            setError('Upload failed')
            return null
        } finally {
            setUploading(false)
            // Reset progress after a brief delay
            setTimeout(() => setProgress(0), 500)
        }
    }, [user, validateFile])

    // ── Upload multiple images ──
    const uploadImages = useCallback(async (files: File[]): Promise<UploadResult[]> => {
        const results: UploadResult[] = []
        for (const file of files) {
            const result = await uploadImage(file)
            if (result) results.push(result)
        }
        return results
    }, [uploadImage])

    // ── Delete an image by storage path ──
    const deleteImage = useCallback(async (filePath: string): Promise<boolean> => {
        try {
            const { error: deleteError } = await supabase.storage
                .from(BUCKET)
                .remove([filePath])

            if (deleteError) {
                setError(deleteError.message)
                return false
            }
            return true
        } catch {
            setError('Delete failed')
            return false
        }
    }, [])

    // ── Extract storage path from a public URL ──
    const getPathFromUrl = useCallback((url: string): string | null => {
        try {
            const match = url.match(/\/product-images\/(.+)$/)
            return match ? match[1] : null
        } catch {
            return null
        }
    }, [])

    return {
        uploading,
        progress,
        error,
        uploadImage,
        uploadImages,
        deleteImage,
        validateFile,
        getPathFromUrl,
    }
}
