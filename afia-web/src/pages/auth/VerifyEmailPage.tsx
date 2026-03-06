import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { useAuth, type UserRole } from '../../contexts/AuthContext'
import { getHomeRoute } from '../../components/auth/ProtectedRoute'
import { Button } from '../../components/ui'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'

type VerifyState = 'loading' | 'success' | 'error'

export default function VerifyEmailPage() {
    const [state, setState] = useState<VerifyState>('loading')
    const [errorMsg, setErrorMsg] = useState('')
    const navigate = useNavigate()
    const { role } = useAuth()

    useEffect(() => {
        let cancelled = false

        const checkAuth = async () => {
            // Give Supabase a moment to process the token from the URL hash
            await new Promise(resolve => setTimeout(resolve, 1500))

            const { data: { session }, error } = await supabase.auth.getSession()

            if (cancelled) return

            if (error) {
                setState('error')
                setErrorMsg(error.message)
                return
            }

            if (session) {
                setState('success')
                // Determine role from session metadata for redirect
                const userRole = (session.user.user_metadata?.role as UserRole) || role || 'BUYER'
                const targetRoute = getHomeRoute(userRole)
                setTimeout(() => {
                    if (!cancelled) navigate(targetRoute, { replace: true })
                }, 2500)
            } else {
                setState('error')
                setErrorMsg('Verification link may have expired. Please try logging in.')
            }
        }

        checkAuth()

        return () => { cancelled = true }
    }, [navigate, role])

    return (
        <div className="min-h-screen flex items-center justify-center bg-platinum-light px-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-platinum p-10 max-w-md w-full text-center shadow-sm"
            >
                {/* Logo */}
                <div className="mb-8">
                    <span className="font-[family-name:var(--font-heading)] text-2xl font-bold text-navy">
                        <span className="text-gold">N</span>eoa
                    </span>
                </div>

                {state === 'loading' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-4"
                    >
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            className="w-12 h-12 mx-auto"
                        >
                            <Loader2 className="w-12 h-12 text-gold" />
                        </motion.div>
                        <h2 className="text-xl font-bold text-navy font-[family-name:var(--font-heading)]">
                            Verifying your email...
                        </h2>
                        <p className="text-platinum-dark text-sm">
                            Please wait while we confirm your account
                        </p>
                    </motion.div>
                )}

                {state === 'success' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="space-y-4"
                    >
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                            className="w-16 h-16 rounded-full bg-neoa-emerald/10 flex items-center justify-center mx-auto"
                        >
                            <CheckCircle className="w-8 h-8 text-neoa-emerald" />
                        </motion.div>
                        <h2 className="text-xl font-bold text-navy font-[family-name:var(--font-heading)]">
                            Email Verified!
                        </h2>
                        <p className="text-platinum-dark text-sm">
                            Your account is now active. Redirecting you to your dashboard...
                        </p>
                        <div className="w-full h-1 bg-platinum rounded-full overflow-hidden mt-4">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: '100%' }}
                                transition={{ duration: 2.5, ease: 'linear' }}
                                className="h-full bg-neoa-emerald rounded-full"
                            />
                        </div>
                    </motion.div>
                )}

                {state === 'error' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="space-y-4"
                    >
                        <div className="w-16 h-16 rounded-full bg-ruby/10 flex items-center justify-center mx-auto">
                            <XCircle className="w-8 h-8 text-ruby" />
                        </div>
                        <h2 className="text-xl font-bold text-navy font-[family-name:var(--font-heading)]">
                            Verification Failed
                        </h2>
                        <p className="text-platinum-dark text-sm">{errorMsg}</p>
                        <div className="flex flex-col gap-3 mt-4">
                            <Link to="/login">
                                <Button variant="primary" size="md" className="w-full">
                                    Go to Login
                                </Button>
                            </Link>
                            <Link to="/signup">
                                <Button variant="ghost" size="md" className="w-full">
                                    Create New Account
                                </Button>
                            </Link>
                        </div>
                    </motion.div>
                )}
            </motion.div>
        </div>
    )
}
