import { useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

/**
 * MODULE 10: MFA Setup Page
 *
 * Allows Admin/Super Admin users to enroll in TOTP-based MFA
 * using Supabase Auth's built-in MFA support.
 *
 * Flow:
 * 1. User clicks "Enable MFA"
 * 2. System enrolls a TOTP factor and displays a QR code
 * 3. User scans QR code with authenticator app (Google Auth, Authy, etc.)
 * 4. User enters the 6-digit code to verify
 * 5. Factor is activated — user now has aal2 assurance
 */
export default function MfaSetup() {
    const { role } = useAuth()
    const [step, setStep] = useState<'idle' | 'enrolling' | 'verifying' | 'done' | 'error'>('idle')
    const [qrUri, setQrUri] = useState<string | null>(null)
    const [secret, setSecret] = useState<string | null>(null)
    const [factorId, setFactorId] = useState<string | null>(null)
    const [otp, setOtp] = useState('')
    const [errorMsg, setErrorMsg] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    // Check if user is admin
    const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN'

    // Step 1: Enroll a new TOTP factor
    const handleEnroll = useCallback(async () => {
        setLoading(true)
        setErrorMsg(null)
        try {
            const { data, error } = await supabase.auth.mfa.enroll({
                factorType: 'totp',
                friendlyName: 'Neoa Admin MFA',
            })

            if (error) {
                setErrorMsg(error.message)
                setStep('error')
                return
            }

            if (data?.totp) {
                setQrUri(data.totp.qr_code)
                setSecret(data.totp.secret)
                setFactorId(data.id)
                setStep('verifying')
            }
        } catch {
            setErrorMsg('Failed to initialize MFA enrollment')
            setStep('error')
        } finally {
            setLoading(false)
        }
    }, [])

    // Step 2: Verify the TOTP code
    const handleVerify = useCallback(async () => {
        if (!factorId || otp.length !== 6) return

        setLoading(true)
        setErrorMsg(null)
        try {
            const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
                factorId,
            })

            if (challengeError) {
                setErrorMsg(challengeError.message)
                setStep('error')
                return
            }

            const { error: verifyError } = await supabase.auth.mfa.verify({
                factorId,
                challengeId: challenge.id,
                code: otp,
            })

            if (verifyError) {
                setErrorMsg('Invalid code. Please try again.')
                setOtp('')
                return
            }

            setStep('done')
        } catch {
            setErrorMsg('Verification failed')
            setStep('error')
        } finally {
            setLoading(false)
        }
    }, [factorId, otp])

    if (!isAdmin) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
                <h2 style={{ color: 'var(--color-ruby, #DC2626)' }}>Access Denied</h2>
                <p>MFA setup is only available for admin users.</p>
            </div>
        )
    }

    return (
        <div style={{
            maxWidth: '480px',
            margin: '2rem auto',
            padding: '2rem',
            background: 'var(--color-card-bg, #1E2A3A)',
            borderRadius: '12px',
            border: '1px solid rgba(197, 160, 89, 0.2)',
        }}>
            <h2 style={{
                fontFamily: "'Playfair Display', serif",
                color: 'var(--color-accent, #C5A059)',
                marginBottom: '1rem',
                fontSize: '1.5rem',
            }}>
                Multi-Factor Authentication
            </h2>

            {step === 'idle' && (
                <div>
                    <p style={{ color: 'var(--color-text-secondary, #9CA3AF)', marginBottom: '1.5rem', lineHeight: '1.6' }}>
                        Protect your admin account with TOTP-based multi-factor authentication.
                        You'll need an authenticator app like Google Authenticator, Authy, or 1Password.
                    </p>
                    <button
                        onClick={handleEnroll}
                        disabled={loading}
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            background: 'var(--color-accent, #C5A059)',
                            color: 'var(--color-deep-navy, #1A2332)',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: 600,
                            fontSize: '1rem',
                            cursor: loading ? 'wait' : 'pointer',
                            opacity: loading ? 0.7 : 1,
                        }}
                    >
                        {loading ? 'Setting up...' : 'Enable MFA'}
                    </button>
                </div>
            )}

            {step === 'verifying' && qrUri && (
                <div>
                    <p style={{ color: 'var(--color-text-secondary, #9CA3AF)', marginBottom: '1rem' }}>
                        Scan this QR code with your authenticator app:
                    </p>
                    <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                        <img
                            src={qrUri}
                            alt="MFA QR Code"
                            style={{
                                width: '200px',
                                height: '200px',
                                background: 'white',
                                padding: '8px',
                                borderRadius: '8px',
                            }}
                        />
                    </div>
                    {secret && (
                        <div style={{
                            background: 'rgba(0,0,0,0.3)',
                            padding: '0.75rem',
                            borderRadius: '6px',
                            marginBottom: '1rem',
                            fontSize: '0.75rem',
                            color: 'var(--color-text-secondary, #9CA3AF)',
                        }}>
                            <strong>Manual entry key:</strong>
                            <code style={{ display: 'block', marginTop: '0.25rem', wordBreak: 'break-all', color: '#fff' }}>
                                {secret}
                            </code>
                        </div>
                    )}
                    <label style={{ display: 'block', color: 'var(--color-text-secondary)', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                        Enter the 6-digit code from your app:
                    </label>
                    <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            fontSize: '1.5rem',
                            textAlign: 'center',
                            letterSpacing: '0.5rem',
                            background: 'rgba(0,0,0,0.2)',
                            border: '1px solid rgba(197, 160, 89, 0.3)',
                            borderRadius: '8px',
                            color: '#fff',
                            marginBottom: '1rem',
                            outline: 'none',
                            boxSizing: 'border-box',
                        }}
                        autoFocus
                    />
                    <button
                        onClick={handleVerify}
                        disabled={loading || otp.length !== 6}
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            background: otp.length === 6 ? 'var(--color-accent, #C5A059)' : 'rgba(197, 160, 89, 0.3)',
                            color: 'var(--color-deep-navy, #1A2332)',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: 600,
                            fontSize: '1rem',
                            cursor: loading || otp.length !== 6 ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.7 : 1,
                        }}
                    >
                        {loading ? 'Verifying...' : 'Verify & Activate'}
                    </button>
                </div>
            )}

            {step === 'done' && (
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
                    <h3 style={{ color: 'var(--color-neoa-emerald, #059669)', marginBottom: '0.5rem' }}>
                        MFA Enabled!
                    </h3>
                    <p style={{ color: 'var(--color-text-secondary)', lineHeight: '1.6' }}>
                        Your account is now protected with multi-factor authentication.
                        You'll be asked for a code from your authenticator app each time you log in.
                    </p>
                </div>
            )}

            {errorMsg && (
                <div style={{
                    marginTop: '1rem',
                    padding: '0.75rem',
                    background: 'rgba(220, 38, 38, 0.1)',
                    border: '1px solid rgba(220, 38, 38, 0.3)',
                    borderRadius: '6px',
                    color: 'var(--color-ruby, #DC2626)',
                    fontSize: '0.875rem',
                }}>
                    {errorMsg}
                </div>
            )}
        </div>
    )
}
