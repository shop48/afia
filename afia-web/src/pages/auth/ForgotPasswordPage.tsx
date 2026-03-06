import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'
import { Button, Input } from '../../components/ui'
import { Mail, ArrowLeft, KeyRound } from 'lucide-react'

export default function ForgotPasswordPage() {
    const { resetPassword, submitting } = useAuth()
    const [email, setEmail] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [sent, setSent] = useState(false)

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setError(null)

        if (!email) {
            setError('Please enter your email address')
            return
        }

        const { error: resetError } = await resetPassword(email)
        if (resetError) {
            setError(resetError)
        } else {
            setSent(true)
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
                    {sent ? (
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
                                <Mail className="w-8 h-8 text-neoa-emerald" />
                            </motion.div>
                            <h2 className="text-xl font-bold text-navy font-[family-name:var(--font-heading)] mb-2">
                                Reset Link Sent
                            </h2>
                            <p className="text-platinum-dark text-sm mb-6 leading-relaxed">
                                Check your inbox at <strong className="text-navy">{email}</strong> for
                                a password reset link. It may take a minute to arrive.
                            </p>
                            <Link to="/login">
                                <Button variant="primary" size="md" className="w-full">
                                    <ArrowLeft className="w-4 h-4" />
                                    Back to Login
                                </Button>
                            </Link>
                        </motion.div>
                    ) : (
                        /* ── Form State ── */
                        <>
                            <div className="text-center mb-6">
                                <div className="w-14 h-14 rounded-2xl bg-gold/10 flex items-center justify-center mx-auto mb-4">
                                    <KeyRound className="w-7 h-7 text-gold" />
                                </div>
                                <h2 className="text-xl font-bold text-navy font-[family-name:var(--font-heading)]">
                                    Forgot Password?
                                </h2>
                                <p className="text-platinum-dark text-sm mt-1">
                                    Enter your email and we'll send you a reset link
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
                                <Input
                                    label="Email Address"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    icon={<Mail className="w-4 h-4" />}
                                    autoComplete="email"
                                    id="forgot-email"
                                />

                                <Button
                                    type="submit"
                                    variant="gold"
                                    size="lg"
                                    loading={submitting}
                                    className="w-full"
                                    id="forgot-submit"
                                >
                                    Send Reset Link
                                </Button>
                            </form>

                            <div className="text-center mt-6">
                                <Link
                                    to="/login"
                                    className="text-sm text-platinum-dark hover:text-navy transition-colors inline-flex items-center gap-1"
                                >
                                    <ArrowLeft className="w-3.5 h-3.5" />
                                    Back to login
                                </Link>
                            </div>
                        </>
                    )}
                </div>
            </motion.div>
        </div>
    )
}
