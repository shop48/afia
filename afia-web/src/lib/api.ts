import { supabase } from './supabase'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787'

/**
 * Get the current access token, waiting briefly if the session isn't ready yet.
 * This handles the case where a component makes an API call immediately on mount
 * before the Supabase client has finished restoring the session from localStorage.
 */
async function getAccessToken(): Promise<string> {
    // Try immediately first
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) return session.access_token

    // Session not ready yet — wait up to 3 seconds for it
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            sub.unsubscribe()
            reject(new Error('Not authenticated — please log in.'))
        }, 3000)

        const { data: { subscription: sub } } = supabase.auth.onAuthStateChange((_event, s) => {
            if (s?.access_token) {
                clearTimeout(timeout)
                sub.unsubscribe()
                resolve(s.access_token)
            }
        })
    })
}

/**
 * Centralized API client that auto-attaches the Supabase auth token.
 * All backend calls should go through this.
 */
export async function apiClient<T = unknown>(
    path: string,
    options: RequestInit = {}
): Promise<T> {
    const token = await getAccessToken()

    const url = `${API_BASE_URL}${path}`

    // 30s request timeout
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30_000)

    let res: Response
    try {
        res = await fetch(url, {
            ...options,
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
                ...(options.headers || {}),
            },
        })
    } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
            throw new Error('Request timed out. Please try again.')
        }
        throw new Error('Network error — please check your connection.')
    } finally {
        clearTimeout(timeout)
    }

    let data: any
    try {
        data = await res.json()
    } catch {
        if (!res.ok) {
            throw new Error(`Server error (${res.status}). Please try again later.`)
        }
        throw new Error('Unexpected response from server.')
    }

    if (!res.ok) {
        throw new Error(data.error || `API error: ${res.status}`)
    }

    return data as T
}
