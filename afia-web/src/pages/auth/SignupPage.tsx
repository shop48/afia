import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'
import { Button, Input } from '../../components/ui'
import { Mail, Lock, User, ArrowRight, ShieldCheck, Store } from 'lucide-react'

type RoleChoice = 'BUYER' | 'VENDOR'

export default function SignupPage() {
    const { signUp, submitting } = useAuth()
    const [fullName, setFullName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [role, setRole] = useState<RoleChoice>('BUYER')
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const [acceptedTerms, setAcceptedTerms] = useState(false)

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setError(null)

        if (!fullName || !email || !password || !confirmPassword) {
            setError('Please fill in all fields')
            return
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters')
            return
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match')
            return
        }
        if (!acceptedTerms) {
            setError('Please accept the Terms of Service and Privacy Policy to continue')
            return
        }

        const { error: authError } = await signUp(email, password, fullName, role)
        if (authError) {
            setError(authError)
        } else {
            setSuccess(true)
        }
    }

    // ── Success Screen ──
    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-platinum-light px-6">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-2xl border border-platinum p-10 max-w-md w-full text-center shadow-sm"
                >
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.2 }}
                        className="w-16 h-16 rounded-full bg-neoa-emerald/10 flex items-center justify-center mx-auto mb-6"
                    >
                        <Mail className="w-8 h-8 text-neoa-emerald" />
                    </motion.div>
                    <h2 className="text-2xl font-bold text-navy font-[family-name:var(--font-heading)] mb-2">
                        Check Your Email
                    </h2>
                    <p className="text-platinum-dark mb-6 leading-relaxed">
                        We've sent a verification link to <strong className="text-navy">{email}</strong>.
                        Click the link to activate your account.
                    </p>
                    <Link to="/login">
                        <Button variant="primary" size="lg" className="w-full">
                            Back to Login
                        </Button>
                    </Link>
                </motion.div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex">
            {/* ══════ LEFT — Branding Panel ══════ */}
            <div className="hidden lg:flex lg:w-[480px] xl:w-[520px] bg-navy relative overflow-hidden">
                <div className="absolute -top-32 -left-32 w-96 h-96 bg-gold/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-neoa-emerald/10 rounded-full blur-3xl" />

                <div className="relative z-10 flex flex-col justify-between p-10 w-full">
                    <Link to="/" className="block">
                        <span className="font-[family-name:var(--font-heading)] text-3xl font-bold text-white tracking-tight">
                            <span className="text-gold">N</span>eoa
                        </span>
                    </Link>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.6 }}
                        className="space-y-6"
                    >
                        <h1 className="text-4xl xl:text-5xl font-bold text-white font-[family-name:var(--font-heading)] leading-tight">
                            Join the<br />
                            <span className="text-gold">Future of Trade.</span>
                        </h1>
                        <p className="text-white/60 text-lg leading-relaxed max-w-sm">
                            Whether you're buying or selling, Neoa protects every transaction
                            with escrow vaulting and verified identities.
                        </p>
                    </motion.div>

                    <p className="text-white/30 text-xs">
                        © 2026 Neoa. All rights reserved.
                    </p>
                </div>
            </div>

            {/* ══════ RIGHT — Signup Form ══════ */}
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

                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-navy font-[family-name:var(--font-heading)]">
                            Create your account
                        </h2>
                        <p className="text-platinum-dark mt-1">
                            Get started in less than a minute
                        </p>
                    </div>

                    {/* ── Role Selection ── */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        {([
                            { value: 'BUYER' as RoleChoice, label: 'I want to Buy', desc: 'Shop with escrow protection', icon: <ShieldCheck className="w-5 h-5" /> },
                            { value: 'VENDOR' as RoleChoice, label: 'I want to Sell', desc: 'List products globally', icon: <Store className="w-5 h-5" /> },
                        ]).map(opt => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => setRole(opt.value)}
                                className={`
                  p-4 rounded-xl border-2 text-left transition-all duration-200 cursor-pointer
                  ${role === opt.value
                                        ? 'border-gold bg-gold/5 shadow-sm'
                                        : 'border-platinum hover:border-platinum-dark bg-white'
                                    }
                `}
                            >
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${role === opt.value ? 'bg-gold/20 text-gold-dark' : 'bg-platinum-light text-platinum-dark'
                                    }`}>
                                    {opt.icon}
                                </div>
                                <p className={`text-sm font-semibold ${role === opt.value ? 'text-navy' : 'text-navy/70'}`}>
                                    {opt.label}
                                </p>
                                <p className="text-xs text-platinum-dark mt-0.5">{opt.desc}</p>
                            </button>
                        ))}
                    </div>

                    {/* Vendor Commission Notice */}
                    {role === 'VENDOR' && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-6 p-4 bg-gold/5 border border-gold/20 rounded-xl"
                        >
                            <div className="flex items-start gap-3">
                                <Store className="w-5 h-5 text-gold mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-sm font-semibold text-navy mb-1">Transparent Commission</p>
                                    <p className="text-xs text-platinum-dark leading-relaxed">
                                        Neoa charges a <strong className="text-navy">15% commission</strong> on each successful transaction.
                                        No monthly fees, no setup costs, no hidden charges. You receive <strong className="text-navy">85%</strong> of every sale directly to your bank account.
                                    </p>
                                    <Link to="/terms" className="text-gold text-xs font-semibold hover:text-gold-dark mt-1 inline-block">
                                        Read full Terms of Service →
                                    </Link>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Error */}
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
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Input
                            label="Full Name"
                            type="text"
                            placeholder="John Doe"
                            value={fullName}
                            onChange={e => setFullName(e.target.value)}
                            icon={<User className="w-4 h-4" />}
                            autoComplete="name"
                            id="signup-name"
                        />

                        <Input
                            label="Email Address"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            icon={<Mail className="w-4 h-4" />}
                            autoComplete="email"
                            id="signup-email"
                        />

                        <Input
                            label="Password"
                            type="password"
                            placeholder="Min. 6 characters"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            icon={<Lock className="w-4 h-4" />}
                            autoComplete="new-password"
                            id="signup-password"
                        />

                        <Input
                            label="Confirm Password"
                            type="password"
                            placeholder="Re-enter password"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            icon={<Lock className="w-4 h-4" />}
                            autoComplete="new-password"
                            id="signup-confirm-password"
                        />

                        {/* Terms of Service & Privacy Policy Consent */}
                        <label className="flex items-start gap-2.5 cursor-pointer pt-2">
                            <input
                                type="checkbox"
                                checked={acceptedTerms}
                                onChange={(e) => setAcceptedTerms(e.target.checked)}
                                className="mt-1 accent-gold w-4 h-4 shrink-0 cursor-pointer"
                                id="signup-terms-consent"
                            />
                            <span className="text-xs text-platinum-dark leading-relaxed">
                                I agree to the{' '}
                                <Link to="/terms" className="text-gold font-semibold hover:text-gold-dark">Terms of Service</Link>
                                {' '}and{' '}
                                <Link to="/privacy" className="text-gold font-semibold hover:text-gold-dark">Privacy Policy</Link>.
                                {role === 'VENDOR' && (
                                    <> I understand that Neoa charges a <strong className="text-navy">15% commission</strong> on each successful transaction.</>
                                )}
                            </span>
                        </label>

                        <Button
                            type="submit"
                            variant="gold"
                            size="lg"
                            loading={submitting}
                            className="w-full"
                            id="signup-submit"
                        >
                            <span>Create {role === 'VENDOR' ? 'Vendor' : 'Buyer'} Account</span>
                            <ArrowRight className="w-4 h-4" />
                        </Button>
                    </form>

                    <p className="text-center text-sm text-platinum-dark mt-6">
                        Already have an account?{' '}
                        <Link to="/login" className="text-gold font-semibold hover:text-gold-dark transition-colors">
                            Sign in
                        </Link>
                    </p>
                </motion.div>
            </div>
        </div>
    )
}
