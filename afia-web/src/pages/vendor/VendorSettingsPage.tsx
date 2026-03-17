import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import AppShell from '../../components/layout/AppShell'
import BankAccountSetup from '../../components/payments/BankAccountSetup'
import SmileIDVerification from '../../components/id/SmileIDVerification'
import {
    ShieldCheck, Building2, BadgeCheck, AlertTriangle,
    Loader2, Settings, ChevronRight, UserCheck, Clock, XCircle
} from 'lucide-react'

// ════════════════════════════════════════════
// MODULE 8: VENDOR SETTINGS PAGE
// KYC Verification + Bank Account Setup
// ════════════════════════════════════════════

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787'

interface KycStatus {
    kyc_level: string
    job_id?: string
    submitted_at?: string
    verified_at?: string
    rejection_reason?: string
}

export default function VendorSettingsPage() {
    const { session, profile, signOut } = useAuth()
    const navigate = useNavigate()
    const [kycStatus, setKycStatus] = useState<KycStatus | null>(null)
    const [loading, setLoading] = useState(true)
    const [showKycModal, setShowKycModal] = useState(false)

    // ── Fetch KYC status ──
    useEffect(() => {
        const fetchStatus = async () => {
            if (!session?.access_token) return

            try {
                const res = await fetch(`${API_URL}/api/kyc/status`, {
                    headers: { Authorization: `Bearer ${session.access_token}` },
                })
                if (res.ok) {
                    const data = await res.json() as KycStatus
                    setKycStatus(data)
                }
            } catch {
                // Silently fail — will show default state
            } finally {
                setLoading(false)
            }
        }
        fetchStatus()
    }, [session])

    const kycLevel = kycStatus?.kyc_level || profile?.kyc_level || 'NONE'

    // ── KYC Status Badge ──
    const getKycBadge = () => {
        switch (kycLevel) {
            case 'VERIFIED':
                return (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-afia-emerald/10 rounded-full">
                        <BadgeCheck className="w-4 h-4 text-afia-emerald" />
                        <span className="text-xs font-semibold text-afia-emerald">Verified</span>
                    </div>
                )
            case 'PENDING':
                return (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-gold/10 rounded-full">
                        <Clock className="w-4 h-4 text-gold" />
                        <span className="text-xs font-semibold text-gold">Pending Review</span>
                    </div>
                )
            case 'REJECTED':
                return (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-ruby/10 rounded-full">
                        <XCircle className="w-4 h-4 text-ruby" />
                        <span className="text-xs font-semibold text-ruby">Rejected</span>
                    </div>
                )
            default:
                return (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-platinum-light rounded-full">
                        <AlertTriangle className="w-4 h-4 text-platinum-dark" />
                        <span className="text-xs font-semibold text-platinum-dark">Not Verified</span>
                    </div>
                )
        }
    }

    if (loading) {
        return (
            <AppShell
                role="VENDOR"
                activePath="/vendor/settings"
                userName={profile?.full_name || 'Vendor'}
                onNavigate={(path) => navigate(path)}
                onLogout={signOut}
            >
                <div className="flex items-center justify-center min-h-[60vh]">
                    <Loader2 className="w-8 h-8 text-gold animate-spin" />
                </div>
            </AppShell>
        )
    }

    return (
        <AppShell
            role="VENDOR"
            activePath="/vendor/settings"
            userName={profile?.full_name || 'Vendor'}
            onNavigate={(path) => navigate(path)}
            onLogout={signOut}
        >
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center gap-3 mb-1">
                        <Settings className="w-5 h-5 text-gold" />
                        <h1 className="text-2xl font-bold text-navy font-[family-name:var(--font-heading)]">
                            Vendor Settings
                        </h1>
                    </div>
                    <p className="text-sm text-platinum-dark">
                        Manage your identity verification and payout settings
                    </p>
                </div>

                <div className="space-y-6">
                    {/* ═══ KYC VERIFICATION CARD ═══ */}
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white rounded-xl border border-platinum p-6"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-navy/5 rounded-full flex items-center justify-center">
                                    <ShieldCheck className="w-5 h-5 text-navy" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-navy">Identity Verification (KYC)</h3>
                                    <p className="text-xs text-platinum-dark">Verify your identity with SmileID</p>
                                </div>
                            </div>
                            {getKycBadge()}
                        </div>

                        {/* KYC Content Based on Status */}
                        {kycLevel === 'VERIFIED' && (
                            <div className="p-4 bg-afia-emerald/5 rounded-xl">
                                <div className="flex items-center gap-2 mb-2">
                                    <UserCheck className="w-5 h-5 text-afia-emerald" />
                                    <span className="text-sm font-semibold text-navy">Identity Verified</span>
                                </div>
                                <p className="text-xs text-platinum-dark">
                                    Your identity was verified on{' '}
                                    {kycStatus?.verified_at
                                        ? new Date(kycStatus.verified_at).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
                                        : 'a previous date'
                                    }.
                                    You have full access to all platform features.
                                </p>
                            </div>
                        )}

                        {kycLevel === 'PENDING' && (
                            <div className="p-4 bg-gold/5 rounded-xl">
                                <div className="flex items-center gap-2 mb-2">
                                    <Loader2 className="w-5 h-5 text-gold animate-spin" />
                                    <span className="text-sm font-semibold text-navy">Verification in Progress</span>
                                </div>
                                <p className="text-xs text-platinum-dark">
                                    Your documents are being reviewed. This usually takes a few minutes.
                                    {kycStatus?.job_id && (
                                        <span className="block mt-1 font-mono text-[10px]">
                                            Job ID: {kycStatus.job_id}
                                        </span>
                                    )}
                                </p>
                            </div>
                        )}

                        {kycLevel === 'REJECTED' && (
                            <div className="p-4 bg-ruby/5 rounded-xl">
                                <div className="flex items-center gap-2 mb-2">
                                    <XCircle className="w-5 h-5 text-ruby" />
                                    <span className="text-sm font-semibold text-navy">Verification Failed</span>
                                </div>
                                <p className="text-xs text-ruby/80 mb-3">
                                    {kycStatus?.rejection_reason || 'Your verification could not be completed. Please try again.'}
                                </p>
                                <button
                                    onClick={() => setShowKycModal(true)}
                                    className="px-4 py-2 rounded-lg text-sm font-medium bg-ruby/10 text-ruby hover:bg-ruby/20 transition-colors cursor-pointer"
                                >
                                    Try Again
                                </button>
                            </div>
                        )}

                        {kycLevel === 'NONE' && (
                            <div className="p-4 bg-platinum-light rounded-xl">
                                <p className="text-xs text-platinum-dark mb-3">
                                    Verify your identity to unlock higher transaction limits and build trust with buyers.
                                    Verified vendors receive a badge on their products.
                                </p>
                                <ul className="text-xs text-platinum-dark space-y-1 mb-4">
                                    <li className="flex items-center gap-2">
                                        <ChevronRight className="w-3 h-3 text-gold" />
                                        <span>🇳🇬 Nigerian vendors: BVN, NIN, Voter's Card, or Passport</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <ChevronRight className="w-3 h-3 text-gold" />
                                        <span>🌍 International vendors: ID document upload + selfie</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <ChevronRight className="w-3 h-3 text-gold" />
                                        <span>Usually completed within 30 seconds</span>
                                    </li>
                                </ul>
                                <button
                                    onClick={() => setShowKycModal(true)}
                                    className="w-full py-3 bg-gold text-navy-dark font-bold rounded-xl flex items-center justify-center gap-2
                                        hover:bg-gold-light transition-colors cursor-pointer"
                                >
                                    <ShieldCheck className="w-4 h-4" />
                                    Start Verification
                                </button>
                            </div>
                        )}
                    </motion.div>

                    {/* ═══ BANK ACCOUNT SETUP CARD ═══ */}
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <BankAccountSetup
                            currentAccount={profile as any}
                            onComplete={() => {
                                // Optionally refresh profile
                            }}
                        />
                    </motion.div>

                    {/* ═══ PAYOUT INFO ═══ */}
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-white rounded-xl border border-platinum p-6"
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-afia-emerald/5 rounded-full flex items-center justify-center">
                                <Building2 className="w-5 h-5 text-afia-emerald" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-navy">Payout Information</h3>
                                <p className="text-xs text-platinum-dark">How you receive your funds</p>
                            </div>
                        </div>

                        <div className="space-y-3 text-xs text-platinum-dark">
                            <div className="flex items-start gap-2">
                                <ChevronRight className="w-3 h-3 text-gold shrink-0 mt-0.5" />
                                <span>Payouts are processed after the buyer confirms delivery and the 48-hour dispute window closes.</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <ChevronRight className="w-3 h-3 text-gold shrink-0 mt-0.5" />
                                <span>NGN payouts are sent directly to your bank account via Paystack.</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <ChevronRight className="w-3 h-3 text-gold shrink-0 mt-0.5" />
                                <span>International payouts (USD, GBP, EUR) are sent via Wise (TransferWise).</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <ChevronRight className="w-3 h-3 text-gold shrink-0 mt-0.5" />
                                <span>Platform fee: 15% covers escrow security, buyer protection, and dispute resolution.</span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* ═══ KYC MODAL ═══ */}
            {showKycModal && (
                <SmileIDVerification
                    onSuccess={() => {
                        setShowKycModal(false)
                        setKycStatus({ ...kycStatus!, kyc_level: 'VERIFIED', verified_at: new Date().toISOString() })
                    }}
                    onClose={() => setShowKycModal(false)}
                />
            )}
        </AppShell>
    )
}
