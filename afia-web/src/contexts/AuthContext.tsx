import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useFingerprint } from '../hooks/useFingerprint'
import type { Session, User } from '@supabase/supabase-js'

// ════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════

export type UserRole = 'GUEST' | 'BUYER' | 'VENDOR' | 'ADMIN' | 'SUPER_ADMIN'
export type KycStatus = 'NONE' | 'PENDING' | 'VERIFIED' | 'REJECTED'

export interface Profile {
    id: string
    full_name: string | null
    role: UserRole
    kyc_level: KycStatus
    kyc_tier: 'TIER_0' | 'TIER_1' | 'TIER_2'
    settlement_currency: string
    wise_recipient_id: string | null
    trust_score: number | null
    kyc_method: string | null
    kyc_country: string | null
    created_at: string
}

interface AuthContextValue {
    session: Session | null
    user: User | null
    profile: Profile | null
    role: UserRole
    initializing: boolean
    submitting: boolean
    signUp: (email: string, password: string, fullName: string, role: 'BUYER' | 'VENDOR') => Promise<{ error: string | null }>
    signIn: (email: string, password: string) => Promise<{ error: string | null; role?: UserRole }>
    signOut: () => void
    resetPassword: (email: string) => Promise<{ error: string | null }>
    refreshProfile: () => Promise<void>
}

// ════════════════════════════════════════════
// CONTEXT + HOOK
// ════════════════════════════════════════════

const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
    return ctx
}

// ════════════════════════════════════════════
// PROVIDER — COMPLETE REWRITE FOR STABILITY
// ════════════════════════════════════════════

export function AuthProvider({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<Session | null>(null)
    const [user, setUser] = useState<User | null>(null)
    const [profile, setProfile] = useState<Profile | null>(null)
    const [role, setRole] = useState<UserRole>('GUEST')
    const [initializing, setInitializing] = useState(true)
    const [submitting, setSubmitting] = useState(false)

    // Use ref to track initialization — avoids stale closure issues with setTimeout
    const initDoneRef = useRef(false)

    // ── Fetch profile (with retry for AbortError in StrictMode) ──
    const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', userId)
                    .single()

                if (error) {
                    if (error.message?.includes('AbortError') || error.message?.includes('aborted')) {
                        await new Promise(r => setTimeout(r, 500))
                        continue
                    }
                    console.error('Profile fetch error:', error.message)
                    return null
                }
                return data as Profile
            } catch (err: unknown) {
                if (err instanceof DOMException && err.name === 'AbortError') {
                    await new Promise(r => setTimeout(r, 500))
                    continue
                }
                console.error('Profile fetch failed:', err)
                return null
            }
        }
        return null
    }, [])


    // ── Helper: clear auth state ──
    const clearAuth = useCallback(() => {
        setSession(null)
        setUser(null)
        setProfile(null)
        setRole('GUEST')
        if (!initDoneRef.current) {
            initDoneRef.current = true
        }
        setInitializing(false)
    }, [])

    // ── Refresh profile (callable externally) ──
    const refreshProfile = useCallback(async () => {
        const currentUser = user
        if (!currentUser) return
        const p = await fetchProfile(currentUser.id)
        if (p) {
            setProfile(p)
            setRole(p.role)
        }
    }, [user, fetchProfile])

    // ═══════════════════════════════════════════
    // INITIALIZATION — single useEffect, single source of truth
    // Key principle: DON'T set initializing=false until we have the correct role.
    // The profile has the authoritative role, not user_metadata.
    // ═══════════════════════════════════════════
    useEffect(() => {
        let mounted = true

        // Safety net: if everything hangs for 12s, unblock the UI
        const safetyTimeout = setTimeout(() => {
            if (mounted && !initDoneRef.current) {
                console.warn('Auth init: 12s safety timeout — unblocking UI')
                initDoneRef.current = true
                setInitializing(false)
            }
        }, 12000)

        // Helper: load session + profile, then mark as initialized
        const loadSessionAndProfile = async (s: Session) => {
            if (!mounted) return

            setSession(s)
            setUser(s.user)

            // Fetch profile with a 6-second race timeout
            let p: Profile | null = null
            try {
                p = await Promise.race([
                    fetchProfile(s.user.id),
                    new Promise<null>((resolve) => setTimeout(() => resolve(null), 6000)),
                ])
            } catch {
                // Profile fetch failed — continue without it
            }

            if (!mounted) return

            if (p) {
                setProfile(p)
                setRole(p.role)
            } else {
                // Fallback to user_metadata role (unreliable for admin users)
                const metaRole = s.user.user_metadata?.role as UserRole | undefined
                setRole(metaRole || 'BUYER')
            }

            if (!initDoneRef.current) {
                initDoneRef.current = true
                setInitializing(false)
            }
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, newSession) => {
                if (!mounted) return

                console.log(`[Auth] event: ${event}, hasSession: ${!!newSession}`)

                switch (event) {
                    case 'INITIAL_SESSION':
                        // Fires once on mount — reads from localStorage (fast, no network needed for basic session)
                        if (newSession) {
                            await loadSessionAndProfile(newSession)
                        } else {
                            // No stored session — user is a guest
                            if (!initDoneRef.current) {
                                initDoneRef.current = true
                                setInitializing(false)
                            }
                        }
                        break

                    case 'SIGNED_IN':
                        // Fires after successful login
                        if (newSession) {
                            await loadSessionAndProfile(newSession)
                        }
                        break

                    case 'TOKEN_REFRESHED':
                        // Token was auto-refreshed — just update session, don't re-fetch profile
                        if (newSession && mounted) {
                            setSession(newSession)
                            setUser(newSession.user)
                        }
                        break

                    case 'SIGNED_OUT':
                        if (mounted) clearAuth()
                        break
                }
            }
        )

        return () => {
            mounted = false
            clearTimeout(safetyTimeout)
            subscription.unsubscribe()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // ═══════════════════════════════════════════
    // SIGN UP
    // ═══════════════════════════════════════════
    const signUp = useCallback(async (
        email: string,
        password: string,
        fullName: string,
        userRole: 'BUYER' | 'VENDOR'
    ): Promise<{ error: string | null }> => {
        setSubmitting(true)
        try {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: { data: { full_name: fullName, role: userRole } },
            })

            if (error) {
                let msg = error.message
                if (error.status === 429 || msg.toLowerCase().includes('rate limit')) {
                    msg = 'Too many attempts. Please wait a few minutes and try again.'
                } else if (msg.toLowerCase().includes('already registered')) {
                    msg = 'An account with this email already exists. Try logging in instead.'
                }
                return { error: msg }
            }
            return { error: null }
        } catch {
            return { error: 'An unexpected error occurred' }
        } finally {
            setSubmitting(false)
        }
    }, [])

    // ═══════════════════════════════════════════
    // SIGN IN
    // Let onAuthStateChange handle state updates.
    // We just call signInWithPassword and wait for the profile
    // to resolve so we can return the role for navigation.
    // ═══════════════════════════════════════════
    const signIn = useCallback(async (
        email: string,
        password: string
    ): Promise<{ error: string | null; role?: UserRole }> => {
        setSubmitting(true)
        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password })

            if (error) {
                let msg = error.message
                if (msg.toLowerCase().includes('email not confirmed')) {
                    msg = 'Please check your email and click the confirmation link before signing in.'
                } else if (msg.toLowerCase().includes('invalid login credentials')) {
                    msg = 'Incorrect email or password. Please try again.'
                }
                return { error: msg }
            }

            // signInWithPassword succeeded — onAuthStateChange will fire SIGNED_IN
            // and loadSessionAndProfile will run. But we need the role NOW for navigation.
            // So we fetch the profile here too (loadSessionAndProfile handles dedup via state).
            if (data.session?.user) {
                const p = await fetchProfile(data.session.user.id)
                const userRole = p?.role || (data.session.user.user_metadata?.role as UserRole) || 'BUYER'

                // Set state directly so navigation doesn't wait for onAuthStateChange
                setSession(data.session)
                setUser(data.session.user)
                setProfile(p)
                setRole(userRole)
                initDoneRef.current = true
                setInitializing(false)

                return { error: null, role: userRole }
            }
            return { error: null }
        } catch {
            return { error: 'An unexpected error occurred' }
        } finally {
            setSubmitting(false)
        }
    }, [fetchProfile])

    // ═══════════════════════════════════════════
    // SIGN OUT
    // ═══════════════════════════════════════════
    const signOut = useCallback(() => {
        clearAuth()
        supabase.auth.signOut().catch(() => { })
    }, [clearAuth])

    // ═══════════════════════════════════════════
    // RESET PASSWORD
    // ═══════════════════════════════════════════
    const resetPassword = useCallback(async (
        email: string
    ): Promise<{ error: string | null }> => {
        setSubmitting(true)
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth/reset-password`,
            })
            if (error) return { error: error.message }
            return { error: null }
        } catch {
            return { error: 'An unexpected error occurred' }
        } finally {
            setSubmitting(false)
        }
    }, [])

    // Module 10: Capture device fingerprint after login for Sybil detection
    useFingerprint(user?.id)

    return (
        <AuthContext.Provider
            value={{
                session, user, profile, role, initializing, submitting,
                signUp, signIn, signOut, resetPassword, refreshProfile,
            }}
        >
            {children}
        </AuthContext.Provider>
    )
}
