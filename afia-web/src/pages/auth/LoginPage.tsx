import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'
import { getHomeRoute } from '../../components/auth/ProtectedRoute'
import { Button, Input } from '../../components/ui'
import { Mail, Lock, ArrowRight, ShieldCheck, Globe, Truck } from 'lucide-react'

export default function LoginPage() {
    const { signIn, submitting } = useAuth()
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setError(null)

        if (!email || !password) {
            setError('Please fill in all fields')
            return
        }

        const { error: authError, role } = await signIn(email, password)
        if (authError) {
            setError(authError)
        } else {
            // Navigate to the appropriate dashboard based on user role
            navigate(getHomeRoute(role || 'BUYER'), { replace: true })
        }
    }

    return (
        <div className="min-h-screen flex">
            {/* ══════ LEFT — Branding Panel ══════ */}
            <div className="hidden lg:flex lg:w-[480px] xl:w-[520px] bg-navy relative overflow-hidden">
                {/* Gradient Orbs */}
                <div className="absolute -top-32 -left-32 w-96 h-96 bg-gold/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-neoa-emerald/10 rounded-full blur-3xl" />

                <div className="relative z-10 flex flex-col justify-between p-10 w-full">
                    {/* Logo */}
                    <div>
                        <span className="font-[family-name:var(--font-heading)] text-3xl font-bold text-white tracking-tight">
                            <span className="text-gold">N</span>eoa
                        </span>
                    </div>

                    {/* Hero Text */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.6 }}
                        className="space-y-6"
                    >
                        <h1 className="text-4xl xl:text-5xl font-bold text-white font-[family-name:var(--font-heading)] leading-tight">
                            Trade Without<br />
                            <span className="text-gold">Borders.</span>
                        </h1>
                        <p className="text-white/60 text-lg leading-relaxed max-w-sm">
                            Africa's premier cross-border escrow marketplace.
                            Your funds are protected until delivery is confirmed.
                        </p>

                        {/* Trust Indicators */}
                        <div className="space-y-3 pt-4">
                            {[
                                { icon: <ShieldCheck className="w-5 h-5" />, text: 'Bank-grade escrow protection' },
                                { icon: <Globe className="w-5 h-5" />, text: 'Multi-currency settlement (NGN, USD, GBP)' },
                                { icon: <Truck className="w-5 h-5" />, text: '48-hour dispute window on every order' },
                            ].map((item, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.4 + i * 0.1, duration: 0.5 }}
                                    className="flex items-center gap-3 text-white/50"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gold shrink-0">
                                        {item.icon}
                                    </div>
                                    <span className="text-sm">{item.text}</span>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Footer */}
                    <p className="text-white/30 text-xs">
                        © 2026 Neoa. All rights reserved.
                    </p>
                </div>
            </div>

            {/* ══════ RIGHT — Login Form ══════ */}
            <div className="flex-1 flex items-center justify-center px-6 py-12 bg-platinum-light">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-md"
                >
                    {/* Mobile Logo */}
                    <div className="lg:hidden text-center mb-8">
                        <span className="font-[family-name:var(--font-heading)] text-3xl font-bold text-navy">
                            <span className="text-gold">N</span>eoa
                        </span>
                    </div>

                    {/* Form Header */}
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-navy font-[family-name:var(--font-heading)]">
                            Welcome back
                        </h2>
                        <p className="text-platinum-dark mt-1">
                            Sign in to your account to continue
                        </p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-6 p-4 bg-ruby/10 border border-ruby/20 rounded-xl"
                        >
                            <p className="text-ruby text-sm font-medium">{error}</p>
                        </motion.div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <Input
                            label="Email Address"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            icon={<Mail className="w-4 h-4" />}
                            autoComplete="email"
                            id="login-email"
                        />

                        <div>
                            <Input
                                label="Password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                icon={<Lock className="w-4 h-4" />}
                                autoComplete="current-password"
                                id="login-password"
                            />
                            <div className="flex justify-end mt-2">
                                <Link
                                    to="/forgot-password"
                                    className="text-sm text-gold hover:text-gold-dark transition-colors font-medium"
                                >
                                    Forgot password?
                                </Link>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            variant="gold"
                            size="lg"
                            loading={submitting}
                            className="w-full"
                            id="login-submit"
                        >
                            <span>Sign In</span>
                            <ArrowRight className="w-4 h-4" />
                        </Button>
                    </form>

                    {/* Divider */}
                    <div className="flex items-center gap-4 my-8">
                        <div className="flex-1 h-px bg-platinum-dark" />
                        <span className="text-xs text-platinum-dark font-medium uppercase tracking-wider">New here?</span>
                        <div className="flex-1 h-px bg-platinum-dark" />
                    </div>

                    {/* Sign Up Link */}
                    <Link to="/signup">
                        <Button variant="secondary" size="lg" className="w-full">
                            Create an Account
                        </Button>
                    </Link>
                </motion.div>
            </div>
        </div>
    )
}
