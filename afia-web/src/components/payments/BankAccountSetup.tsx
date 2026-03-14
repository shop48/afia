import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'
import {
    Building2, CheckCircle, AlertTriangle, Loader2,
    Search, ChevronDown, X, ShieldCheck
} from 'lucide-react'

// ════════════════════════════════════════════
// MODULE 8: VENDOR BANK ACCOUNT SETUP
// Links vendor bank account for NGN payouts
// Uses Paystack Resolve Account to verify
// ════════════════════════════════════════════

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787'

interface Bank {
    id: number
    name: string
    code: string
    active: boolean
}

interface BankAccountSetupProps {
    onComplete?: () => void
    currentAccount?: {
        bank_name?: string
        bank_account_number?: string
        bank_account_name?: string
    } | null
}

// Static fallback list of major Nigerian banks
// Used when Paystack API is unreachable (e.g. no API key configured)
const NIGERIAN_BANKS_FALLBACK: Bank[] = [
    { id: 1, name: 'Access Bank', code: '044', active: true },
    { id: 2, name: 'Citibank Nigeria', code: '023', active: true },
    { id: 3, name: 'Ecobank Nigeria', code: '050', active: true },
    { id: 4, name: 'Fidelity Bank', code: '070', active: true },
    { id: 5, name: 'First Bank of Nigeria', code: '011', active: true },
    { id: 6, name: 'First City Monument Bank', code: '214', active: true },
    { id: 7, name: 'Globus Bank', code: '00103', active: true },
    { id: 8, name: 'Guaranty Trust Bank', code: '058', active: true },
    { id: 9, name: 'Heritage Bank', code: '030', active: true },
    { id: 10, name: 'Jaiz Bank', code: '301', active: true },
    { id: 11, name: 'Keystone Bank', code: '082', active: true },
    { id: 12, name: 'Kuda Bank', code: '50211', active: true },
    { id: 13, name: 'Moniepoint MFB', code: '50515', active: true },
    { id: 14, name: 'OPay', code: '999992', active: true },
    { id: 15, name: 'PalmPay', code: '999991', active: true },
    { id: 16, name: 'Parallex Bank', code: '526', active: true },
    { id: 17, name: 'Polaris Bank', code: '076', active: true },
    { id: 18, name: 'Providus Bank', code: '101', active: true },
    { id: 19, name: 'Stanbic IBTC Bank', code: '221', active: true },
    { id: 20, name: 'Standard Chartered Bank', code: '068', active: true },
    { id: 21, name: 'Sterling Bank', code: '232', active: true },
    { id: 22, name: 'SunTrust Bank', code: '100', active: true },
    { id: 23, name: 'Titan Trust Bank', code: '102', active: true },
    { id: 24, name: 'Union Bank of Nigeria', code: '032', active: true },
    { id: 25, name: 'United Bank for Africa', code: '033', active: true },
    { id: 26, name: 'Unity Bank', code: '215', active: true },
    { id: 27, name: 'VFD Microfinance Bank', code: '566', active: true },
    { id: 28, name: 'Wema Bank', code: '035', active: true },
    { id: 29, name: 'Zenith Bank', code: '057', active: true },
]

export default function BankAccountSetup({ onComplete, currentAccount }: BankAccountSetupProps) {
    const { session } = useAuth()
    const [banks, setBanks] = useState<Bank[]>([])
    const [banksLoading, setBanksLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [showDropdown, setShowDropdown] = useState(false)

    const [selectedBank, setSelectedBank] = useState<Bank | null>(null)
    const [accountNumber, setAccountNumber] = useState('')
    const [verifiedName, setVerifiedName] = useState<string | null>(null)

    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    // ── Fetch banks list ──
    useEffect(() => {
        const fetchBanks = async () => {
            try {
                const response = await fetch(`${API_URL}/api/banks?country=nigeria&currency=NGN`, {
                    headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
                })
                if (!response.ok) throw new Error('Failed to fetch banks')
                const data = await response.json() as { banks: Bank[] }
                const liveBanks = (data.banks || []).filter(b => b.active)
                if (liveBanks.length > 0) {
                    setBanks(liveBanks)
                } else {
                    throw new Error('Empty bank list')
                }
            } catch {
                // Fallback: use a static list of major Nigerian banks
                // so vendors can still set up their account
                setBanks(NIGERIAN_BANKS_FALLBACK)
            } finally {
                setBanksLoading(false)
            }
        }
        fetchBanks()
    }, [session])

    // Filter banks based on search
    const filteredBanks = banks.filter(b =>
        b.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    // ── Submit bank account ──
    const handleSubmit = useCallback(async () => {
        if (!session?.access_token) {
            setError('Please log in first')
            return
        }
        if (!selectedBank) {
            setError('Please select a bank')
            return
        }
        if (!accountNumber || accountNumber.length !== 10) {
            setError('Please enter a valid 10-digit account number')
            return
        }

        setSubmitting(true)
        setError(null)
        setVerifiedName(null)

        try {
            const response = await fetch(`${API_URL}/api/vendor/bank-account`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    accountNumber,
                    bankCode: selectedBank.code,
                    bankName: selectedBank.name,
                }),
            })

            const data = await response.json() as {
                account_name?: string
                error?: string
                message?: string
            }

            if (!response.ok) {
                throw new Error(data.error || 'Failed to verify bank account')
            }

            setVerifiedName(data.account_name || null)
            setSuccess(true)
            onComplete?.()
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Verification failed'
            setError(message)
        } finally {
            setSubmitting(false)
        }
    }, [session, selectedBank, accountNumber, onComplete])

    // ── Success state ──
    if (success) {
        return (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl border border-platinum p-6">
                <div className="text-center">
                    <div className="w-14 h-14 bg-afia-emerald/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-7 h-7 text-afia-emerald" />
                    </div>
                    <h3 className="text-lg font-bold text-navy mb-1">Bank Account Verified!</h3>
                    <p className="text-sm text-platinum-dark">
                        Account: <span className="font-semibold text-navy">{verifiedName}</span>
                    </p>
                    <p className="text-xs text-platinum-dark mt-1">
                        {selectedBank?.name} • ****{accountNumber.slice(-4)}
                    </p>

                    <div className="mt-4 p-3 bg-afia-emerald/5 rounded-lg text-left">
                        <div className="flex items-center gap-2 text-xs text-afia-emerald font-medium">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Ready for payouts</span>
                        </div>
                        <p className="text-[10px] text-platinum-dark mt-1">
                            Payouts will be sent to this account when orders are completed and the dispute window has passed.
                        </p>
                    </div>
                </div>
            </motion.div>
        )
    }

    return (
        <div className="bg-white rounded-xl border border-platinum p-6">
            <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-gold/10 rounded-full flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-gold" />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-navy">Bank Account Setup</h3>
                    <p className="text-xs text-platinum-dark">Add your bank account for NGN payouts</p>
                </div>
            </div>

            {/* Current account indicator */}
            {currentAccount?.bank_account_number && !success && (
                <div className="mb-4 p-3 bg-platinum-light rounded-lg flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-afia-emerald" />
                    <div className="text-xs">
                        <span className="text-navy font-medium">{currentAccount.bank_name}</span>
                        <span className="text-platinum-dark"> • ****{currentAccount.bank_account_number.slice(-4)}</span>
                        {currentAccount.bank_account_name && (
                            <span className="text-platinum-dark"> • {currentAccount.bank_account_name}</span>
                        )}
                    </div>
                </div>
            )}

            <div className="space-y-4">
                {/* Bank Selection */}
                <div className="relative">
                    <label className="text-xs font-medium text-navy block mb-1.5">Select Bank *</label>
                    <button
                        onClick={() => setShowDropdown(!showDropdown)}
                        disabled={banksLoading}
                        className="w-full flex items-center justify-between px-4 py-3 border border-platinum rounded-xl text-sm hover:border-gold/50 transition-colors cursor-pointer disabled:opacity-60"
                    >
                        {banksLoading ? (
                            <span className="flex items-center gap-2 text-platinum-dark">
                                <Loader2 className="w-4 h-4 animate-spin" /> Loading banks...
                            </span>
                        ) : selectedBank ? (
                            <span className="text-navy font-medium">{selectedBank.name}</span>
                        ) : (
                            <span className="text-platinum-dark">Choose your bank</span>
                        )}
                        <ChevronDown className={`w-4 h-4 text-platinum-dark transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                        {showDropdown && (
                            <motion.div
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                className="absolute top-full left-0 right-0 mt-1 bg-white border border-platinum rounded-xl shadow-lg z-20 max-h-60 overflow-hidden"
                            >
                                <div className="p-2 border-b border-platinum">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-platinum-dark" />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                            placeholder="Search banks..."
                                            className="w-full pl-9 pr-8 py-2 text-sm border border-platinum rounded-lg focus:outline-none focus:ring-1 focus:ring-gold/40"
                                            autoFocus
                                        />
                                        {searchQuery && (
                                            <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer">
                                                <X className="w-4 h-4 text-platinum-dark" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="overflow-y-auto max-h-48">
                                    {filteredBanks.length === 0 ? (
                                        <p className="text-center text-xs text-platinum-dark py-4">No banks found</p>
                                    ) : (
                                        filteredBanks.map(bank => (
                                            <button
                                                key={bank.id}
                                                onClick={() => {
                                                    setSelectedBank(bank)
                                                    setShowDropdown(false)
                                                    setSearchQuery('')
                                                }}
                                                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gold/5 transition-colors cursor-pointer
                                                    ${selectedBank?.id === bank.id ? 'bg-gold/10 text-navy font-medium' : 'text-navy'}`}
                                            >
                                                {bank.name}
                                            </button>
                                        ))
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Account Number */}
                <div>
                    <label className="text-xs font-medium text-navy block mb-1.5">Account Number *</label>
                    <input
                        type="text"
                        value={accountNumber}
                        onChange={e => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 10)
                            setAccountNumber(val)
                        }}
                        placeholder="0123456789"
                        className="w-full px-4 py-3 border border-platinum rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold font-mono tracking-wider"
                        maxLength={10}
                        inputMode="numeric"
                    />
                    <p className="text-[10px] text-platinum-dark mt-1">
                        {accountNumber.length}/10 digits
                    </p>
                </div>

                {/* Error */}
                {error && (
                    <div className="p-3 bg-ruby/5 border border-ruby/20 rounded-lg flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-ruby shrink-0 mt-0.5" />
                        <p className="text-xs text-ruby">{error}</p>
                    </div>
                )}

                {/* Submit */}
                <button
                    onClick={handleSubmit}
                    disabled={submitting || !selectedBank || accountNumber.length !== 10}
                    className="w-full py-3.5 bg-gold text-navy-dark font-bold rounded-xl flex items-center justify-center gap-2
                        hover:bg-gold-light transition-all cursor-pointer shadow-sm
                        disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {submitting ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Verifying Account...
                        </>
                    ) : (
                        <>
                            <ShieldCheck className="w-4 h-4" />
                            Verify & Save Bank Account
                        </>
                    )}
                </button>

                <p className="text-[10px] text-center text-platinum-dark">
                    We verify your account via Paystack to ensure correct payouts. Your details are encrypted.
                </p>
            </div>
        </div>
    )
}
