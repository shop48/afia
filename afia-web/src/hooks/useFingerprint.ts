import { useCallback, useEffect, useRef } from 'react'
import { apiClient } from '../lib/api'

/**
 * MODULE 10: Device Fingerprint Hook
 *
 * Captures a browser fingerprint (canvas/WebGL/audio hash) and sends it
 * to the backend for Sybil attack detection. This runs once after login.
 *
 * If PostHog is configured, uses its distinct_id.
 * Otherwise, generates a basic canvas-based fingerprint.
 */
export function useFingerprint(userId: string | undefined) {
    const sentRef = useRef(false)

    const generateFingerprint = useCallback(async (): Promise<string> => {
        // Try PostHog first (if loaded)
        const posthog = (window as any).posthog
        if (posthog?.get_distinct_id) {
            return `ph:${posthog.get_distinct_id()}`
        }

        // Fallback: Canvas-based fingerprint
        try {
            const canvas = document.createElement('canvas')
            canvas.width = 200
            canvas.height = 50
            const ctx = canvas.getContext('2d')
            if (!ctx) return 'no-canvas'

            // Draw text with specific font rendering (varies by device/OS)
            ctx.textBaseline = 'top'
            ctx.font = '14px Arial'
            ctx.fillStyle = '#f60'
            ctx.fillRect(125, 1, 62, 20)
            ctx.fillStyle = '#069'
            ctx.fillText('Neoa fingerprint', 2, 15)
            ctx.fillStyle = 'rgba(102, 204, 0, 0.7)'
            ctx.fillText('Neoa fingerprint', 4, 17)

            const dataUrl = canvas.toDataURL()

            // Simple hash of the canvas data
            const encoder = new TextEncoder()
            const data = encoder.encode(dataUrl)
            const hashBuffer = await crypto.subtle.digest('SHA-256', data)
            const hashArray = Array.from(new Uint8Array(hashBuffer))
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

            return `cv:${hashHex.slice(0, 32)}`
        } catch {
            return `fallback:${navigator.userAgent.slice(0, 50)}`
        }
    }, [])

    useEffect(() => {
        if (!userId || sentRef.current) return

        const sendFingerprint = async () => {
            try {
                const fp = await generateFingerprint()
                await apiClient('/api/profile/fingerprint', {
                    method: 'POST',
                    body: JSON.stringify({ fingerprint: fp }),
                })
                sentRef.current = true
            } catch (err) {
                // Non-critical — fail silently
                console.debug('Fingerprint capture failed:', err)
            }
        }

        // Delay to avoid blocking auth flow
        const timer = setTimeout(sendFingerprint, 3000)
        return () => clearTimeout(timer)
    }, [userId, generateFingerprint])
}
