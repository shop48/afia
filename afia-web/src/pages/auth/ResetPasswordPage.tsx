import { useState, useEffect, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { Button, Input } from '../../components/ui'
import { Lock, KeyRound, CheckCircle, Eye, EyeOff } from 'lucide-react'

export default function ResetPasswordPage() {
    const navigate = useNavigate()
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [sessionReady, setSessionReady] = useState(false)
    const [checkingSession, setCheckingSession] = useState(true)

    // ── Listen for the PASSWORD_RECOVERY event from Supabase ──
    // When the user clicks the reset link in their email, Supabase
    // exchanges the token in the URL for a session and fires this event.
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event) => {
                if (event === 'PASSWORD_RECOVERY') {
                    setSessionReady(true)
                    setCheckingSession(false)
                }
            }
        )

        // Safety: if no event fires within 5s, the link may be expired
        const timeout = setTimeout(() => {
            setCheckingSession(false)
        }, 5000)

        return () => {
            subscription.unsubscribe()
            clearTimeout(timeout)
        }
    }, [])

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setError(null)

        if (!password) {
            setError('Please enter a new password')
            return
        }
        if (password.length < 8) {
            setError('Password must be at least 8 characters')
            return
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match')
            return
        }

        setLoading(true)
        try {
            const { error: updateError } = await supabase.auth.updateUser({
                password,
            })

            if (updateError) {
                setError(updateError.message)
            } else {
                setSuccess(true)
                // Redirect to login after 3 seconds
                setTimeout(() => navigate('/login'), 3000)
            }
        } catch {
            setError('An unexpected error occurred')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-platinum-light px-6 py-12">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md"
            >
                {/* Logo */}
                <div className="text-center mb-10">
                    <Link to="/">
                        <span className="font-[family-name:var(--font-heading)] text-3xl font-bold text-navy">
                            <span className="text-gold">N</span>eoa
                        </span>
                    </Link>
                </div>

                <div className="bg-white rounded-2xl border border-platinum p-8 shadow-sm">
                    {success ? (
                        /* ── Success State ── */
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center"
                        >
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
                                className="w-16 h-16 rounded-full bg-neoa-emerald/10 flex items-center justify-center mx-auto mb-6"
                            >
                                <CheckCircle className="w-8 h-8 text-neoa-emerald" />
                            </motion.div>
                            <h2 className="text-xl font-bold text-navy font-[family-name:var(--font-heading)] mb-2">
                                Password Updated
                            </h2>
                            <p className="text-platinum-dark text-sm mb-6 leading-relaxed">
                                Your password has been successfully reset. Redirecting you to login...
                            </p>
                            <Link to="/login">
                                <Button variant="primary" size="md" className="w-full">
                                    Go to Login
                                </Button>
                            </Link>
                        </motion.div>
                    ) : checkingSession ? (
                        /* ── Loading / Verifying Token ── */
                        <div className="text-center py-8">
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                className="w-10 h-10 border-3 border-platinum border-t-gold rounded-full mx-auto mb-4"
                            />
                            <p className="text-platinum-dark text-sm">
                                Verifying your reset link...
                            </p>
                        </div>
                    ) : !sessionReady ? (
                        /* ── Expired / Invalid Link ── */
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center"
                        >
                            <div className="w-14 h-14 rounded-2xl bg-ruby/10 flex items-center justify-center mx-auto mb-4">
                                <KeyRound className="w-7 h-7 text-ruby" />
                            </div>
                            <h2 className="text-xl font-bold text-navy font-[family-name:var(--font-heading)] mb-2">
                                Link Expired
                            </h2>
                            <p className="text-platinum-dark text-sm mb-6 leading-relaxed">
                                This password reset link has expired or is invalid.
                                Please request a new one.
                            </p>
                            <Link to="/forgot-password">
                                <Button variant="gold" size="md" className="w-full">
                                    Request New Link
                                </Button>
                            </Link>
                        </motion.div>
                    ) : (
                        /* ── Password Form ── */
                        <>
                            <div className="text-center mb-6">
                                <div className="w-14 h-14 rounded-2xl bg-gold/10 flex items-center justify-center mx-auto mb-4">
                                    <Lock className="w-7 h-7 text-gold" />
                                </div>
                                <h2 className="text-xl font-bold text-navy font-[family-name:var(--font-heading)]">
                                    Set New Password
                                </h2>
                                <p className="text-platinum-dark text-sm mt-1">
                                    Choose a strong password for your account
                                </p>
                            </div>

                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mb-5 p-3 bg-ruby/10 border border-ruby/20 rounded-xl"
                                >
                                    <p className="text-ruby text-sm font-medium">{error}</p>
                                </motion.div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div className="relative">
                                    <Input
                                        label="New Password"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Minimum 8 characters"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        icon={<Lock className="w-4 h-4" />}
                                        autoComplete="new-password"
                                        id="reset-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-[38px] text-platinum-dark hover:text-navy transition-colors"
                                        tabIndex={-1}
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>

                                <div className="relative">
                                    <Input
                                        label="Confirm Password"
                                        type={showConfirm ? 'text' : 'password'}
                                        placeholder="Re-enter your password"
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        icon={<Lock className="w-4 h-4" />}
                                        autoComplete="new-password"
                                        id="reset-confirm"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirm(!showConfirm)}
                                        className="absolute right-3 top-[38px] text-platinum-dark hover:text-navy transition-colors"
                                        tabIndex={-1}
                                    >
                                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>

                                <Button
                                    type="submit"
                                    variant="gold"
                                    size="lg"
                                    loading={loading}
                                    className="w-full"
                                    id="reset-submit"
                                >
                                    Reset Password
                                </Button>
                            </form>
                        </>
                    )}
                </div>
            </motion.div>
        </div>
    )
}
