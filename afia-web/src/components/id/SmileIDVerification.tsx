import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'
import {
    ScanFace, UserCheck, AlertTriangle, Loader2,
    Camera, Upload, ChevronRight, X, ShieldCheck, FileText, Lock
} from 'lucide-react'

// ════════════════════════════════════════════
// MODULE 8: REAL SMILEID KYC VERIFICATION
// Replaces mock simulation with actual API calls
// ════════════════════════════════════════════

type KycStep = 'SELECT_ID' | 'ENTER_DETAILS' | 'SELFIE' | 'SUBMITTING' | 'PENDING' | 'SUCCESS' | 'FAILED'

const ID_TYPES = [
    { value: 'BVN', label: 'Bank Verification Number (BVN)', country: 'NG' },
    { value: 'NIN', label: 'National Identity Number (NIN)', country: 'NG' },
    { value: 'VOTER_ID', label: 'Voter\'s Card', country: 'NG' },
    { value: 'DRIVERS_LICENSE', label: 'Driver\'s License', country: 'NG' },
    { value: 'PASSPORT', label: 'International Passport', country: 'NG' },
]

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787'

interface SmileIDProps {
    onSuccess: () => void
    onClose?: () => void
}

export default function SmileIDVerification({ onSuccess, onClose }: SmileIDProps) {
    const { session } = useAuth()
    const [step, setStep] = useState<KycStep>('SELECT_ID')
    const [idType, setIdType] = useState('')
    const [idNumber, setIdNumber] = useState('')
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [dob, setDob] = useState('')
    const [selfieImage, setSelfieImage] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [jobId, setJobId] = useState<string | null>(null)
    const [rejectionReason, setRejectionReason] = useState<string | null>(null)

    const fileInputRef = useRef<HTMLInputElement>(null)
    const videoRef = useRef<HTMLVideoElement>(null)
    const [showCamera, setShowCamera] = useState(false)
    const [stream, setStream] = useState<MediaStream | null>(null)

    // Polling cleanup ref — prevents orphaned timers after unmount
    const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const isMountedRef = useRef(true)

    // Cleanup on unmount
    useEffect(() => {
        isMountedRef.current = true
        return () => {
            isMountedRef.current = false
            if (pollTimerRef.current) {
                clearTimeout(pollTimerRef.current)
                pollTimerRef.current = null
            }
            // Also stop camera stream if open
            if (stream) {
                stream.getTracks().forEach(t => t.stop())
            }
        }
    }, [])

    // ── Submit KYC to backend ──
    const submitKyc = useCallback(async () => {
        if (!session?.access_token) {
            setError('You must be logged in')
            return
        }

        setStep('SUBMITTING')
        setError(null)

        try {
            const response = await fetch(`${API_URL}/api/kyc/submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    idType,
                    idNumber: idNumber.trim(),
                    firstName: firstName.trim() || undefined,
                    lastName: lastName.trim() || undefined,
                    dob: dob || undefined,
                    country: 'NG',
                    selfieImage: selfieImage || undefined,
                }),
            })

            const data = await response.json() as { message?: string; job_id?: string; error?: string }

            if (!response.ok) {
                throw new Error(data.error || 'KYC submission failed')
            }

            setJobId(data.job_id || null)
            setStep('PENDING')

            // Start polling for result
            pollKycStatus()
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Submission failed'
            setError(message)
            setStep('FAILED')
        }
    }, [session, idType, idNumber, firstName, lastName, dob, selfieImage])

    // ── Poll for KYC status ──
    const pollKycStatus = useCallback(async () => {
        if (!session?.access_token) return

        let attempts = 0
        const maxAttempts = 20 // ~2 minutes of polling

        const poll = async () => {
            if (!isMountedRef.current) return
            attempts++
            try {
                const response = await fetch(`${API_URL}/api/kyc/status`, {
                    headers: { Authorization: `Bearer ${session.access_token}` },
                })
                const data = await response.json() as { kyc_level?: string; reason?: string }

                if (!isMountedRef.current) return

                if (data.kyc_level === 'VERIFIED') {
                    setStep('SUCCESS')
                    onSuccess()
                    return
                } else if (data.kyc_level === 'REJECTED') {
                    setRejectionReason(data.reason || 'Verification failed')
                    setStep('FAILED')
                    return
                }
            } catch {
                // Ignore poll errors — just retry
            }

            if (attempts < maxAttempts && isMountedRef.current) {
                pollTimerRef.current = setTimeout(poll, 6000) // Poll every 6 seconds
            }
        }

        // First poll after 5 seconds
        pollTimerRef.current = setTimeout(poll, 5000)
    }, [session, onSuccess])

    // ── Camera handling ──
    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: 640, height: 480 },
            })
            setStream(mediaStream)
            setShowCamera(true)
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream
            }
        } catch {
            setError('Camera access denied. Please allow camera access or upload a photo.')
        }
    }

    const capturePhoto = () => {
        if (!videoRef.current) return
        const canvas = document.createElement('canvas')
        canvas.width = videoRef.current.videoWidth
        canvas.height = videoRef.current.videoHeight
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.drawImage(videoRef.current, 0, 0)
        const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1]
        setSelfieImage(base64)
        stopCamera()
    }

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(t => t.stop())
            setStream(null)
        }
        setShowCamera(false)
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (file.size > 5 * 1024 * 1024) {
            setError('File too large. Maximum 5MB.')
            return
        }
        const reader = new FileReader()
        reader.onload = () => {
            const base64 = (reader.result as string).split(',')[1]
            setSelfieImage(base64)
        }
        reader.readAsDataURL(file)
    }

    // ── Render ──
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden"
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-navy to-navy-dark p-5 text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <ShieldCheck className="w-6 h-6 text-gold" />
                            <div>
                                <h2 className="text-lg font-bold font-[family-name:var(--font-heading)]">Identity Verification</h2>
                                <p className="text-xs text-white/70">Powered by Smile Identity</p>
                            </div>
                        </div>
                        {onClose && step !== 'SUBMITTING' && (
                            <button onClick={onClose} className="text-white/60 hover:text-white transition-colors cursor-pointer">
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </div>

                <div className="p-6">
                    <AnimatePresence mode="wait">
                        {/* ── Step 1: Select ID Type ── */}
                        {step === 'SELECT_ID' && (
                            <motion.div key="select" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                <p className="text-sm text-platinum-dark mb-4">Select your identification document type:</p>
                                <div className="space-y-2">
                                    {ID_TYPES.map(type => (
                                        <button
                                            key={type.value}
                                            onClick={() => { setIdType(type.value); setStep('ENTER_DETAILS') }}
                                            className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer
                                                ${idType === type.value ? 'border-gold bg-gold/5' : 'border-platinum hover:border-gold/50'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <FileText className="w-4 h-4 text-platinum-dark" />
                                                <span className="text-sm font-medium text-navy">{type.label}</span>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-platinum-dark" />
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {/* ── Step 2: Enter Details ── */}
                        {step === 'ENTER_DETAILS' && (
                            <motion.div key="details" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                <p className="text-sm text-platinum-dark mb-4">
                                    Enter your <span className="font-semibold text-navy">{ID_TYPES.find(t => t.value === idType)?.label}</span> details:
                                </p>

                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs font-medium text-navy block mb-1">{idType} Number *</label>
                                        <input
                                            type="text"
                                            value={idNumber}
                                            onChange={e => setIdNumber(e.target.value)}
                                            placeholder={idType === 'BVN' ? '22212345678' : 'Enter ID number'}
                                            className="w-full px-4 py-3 border border-platinum rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
                                            maxLength={20}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs font-medium text-navy block mb-1">First Name</label>
                                            <input
                                                type="text"
                                                value={firstName}
                                                onChange={e => setFirstName(e.target.value)}
                                                placeholder="John"
                                                className="w-full px-4 py-3 border border-platinum rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-navy block mb-1">Last Name</label>
                                            <input
                                                type="text"
                                                value={lastName}
                                                onChange={e => setLastName(e.target.value)}
                                                placeholder="Doe"
                                                className="w-full px-4 py-3 border border-platinum rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-navy block mb-1">Date of Birth</label>
                                        <input
                                            type="date"
                                            value={dob}
                                            onChange={e => setDob(e.target.value)}
                                            className="w-full px-4 py-3 border border-platinum rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
                                        />
                                    </div>
                                </div>

                                {error && (
                                    <div className="mt-3 p-2 bg-ruby/5 border border-ruby/20 rounded-lg text-xs text-ruby flex items-center gap-2">
                                        <AlertTriangle className="w-3 h-3 shrink-0" /> {error}
                                    </div>
                                )}

                                <div className="flex gap-3 mt-5">
                                    <button
                                        onClick={() => setStep('SELECT_ID')}
                                        className="flex-1 py-3 text-sm border border-platinum rounded-xl text-navy hover:bg-platinum-light transition-colors cursor-pointer"
                                    >
                                        Back
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (!idNumber.trim() || idNumber.trim().length < 5) {
                                                setError(`Please enter a valid ${idType} number`)
                                                return
                                            }
                                            setError(null)
                                            setStep('SELFIE')
                                        }}
                                        className="flex-1 py-3 text-sm bg-gold text-navy-dark font-bold rounded-xl hover:bg-gold-light transition-colors cursor-pointer"
                                    >
                                        Next
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* ── Step 3: Selfie ── */}
                        {step === 'SELFIE' && (
                            <motion.div key="selfie" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                <p className="text-sm text-platinum-dark mb-4">
                                    Take a selfie or upload a clear photo of your face. This is optional but improves verification speed.
                                </p>

                                {showCamera ? (
                                    <div className="relative mb-4">
                                        <video
                                            ref={videoRef}
                                            autoPlay
                                            playsInline
                                            muted
                                            className="w-full rounded-xl border border-platinum"
                                        />
                                        <div className="flex gap-2 mt-3">
                                            <button onClick={capturePhoto} className="flex-1 py-3 bg-gold text-navy-dark font-bold rounded-xl text-sm cursor-pointer">
                                                <span className="inline-flex items-center gap-1.5"><Camera className="w-4 h-4" /> Capture</span>
                                            </button>
                                            <button onClick={stopCamera} className="py-3 px-4 border border-platinum rounded-xl text-sm cursor-pointer">
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : selfieImage ? (
                                    <div className="relative mb-4">
                                        <img
                                            src={`data:image/jpeg;base64,${selfieImage}`}
                                            alt="Selfie"
                                            className="w-full rounded-xl border border-afia-emerald/30"
                                        />
                                        <button
                                            onClick={() => setSelfieImage(null)}
                                            className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-sm cursor-pointer"
                                        >
                                            <X className="w-4 h-4 text-ruby" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                        <button
                                            onClick={startCamera}
                                            className="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-platinum rounded-xl hover:border-gold/50 transition-colors cursor-pointer"
                                        >
                                            <Camera className="w-8 h-8 text-platinum-dark" />
                                            <span className="text-xs text-navy font-medium">Take Selfie</span>
                                        </button>
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-platinum rounded-xl hover:border-gold/50 transition-colors cursor-pointer"
                                        >
                                            <Upload className="w-8 h-8 text-platinum-dark" />
                                            <span className="text-xs text-navy font-medium">Upload Photo</span>
                                        </button>
                                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                                    </div>
                                )}

                                {error && (
                                    <div className="mb-3 p-2 bg-ruby/5 border border-ruby/20 rounded-lg text-xs text-ruby flex items-center gap-2">
                                        <AlertTriangle className="w-3 h-3 shrink-0" /> {error}
                                    </div>
                                )}

                                <div className="flex gap-3">
                                    <button onClick={() => setStep('ENTER_DETAILS')} className="flex-1 py-3 text-sm border border-platinum rounded-xl text-navy hover:bg-platinum-light transition-colors cursor-pointer">
                                        Back
                                    </button>
                                    <button
                                        onClick={submitKyc}
                                        className="flex-1 py-3 text-sm bg-gold text-navy-dark font-bold rounded-xl hover:bg-gold-light transition-colors cursor-pointer"
                                    >
                                        {selfieImage ? 'Verify with Selfie' : 'Verify ID Only'}
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* ── Submitting ── */}
                        {step === 'SUBMITTING' && (
                            <motion.div key="submitting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-8 text-center">
                                <div className="relative w-20 h-20 mx-auto mb-4">
                                    <div className="absolute inset-0 border-4 border-gold/20 rounded-full animate-ping" />
                                    <div className="relative bg-gold/10 w-full h-full rounded-full flex items-center justify-center">
                                        <Loader2 className="w-8 h-8 text-gold animate-spin" />
                                    </div>
                                </div>
                                <p className="font-medium text-navy">Submitting verification...</p>
                                <p className="text-xs text-platinum-dark mt-1">This may take a few seconds</p>
                            </motion.div>
                        )}

                        {/* ── Pending (polling) ── */}
                        {step === 'PENDING' && (
                            <motion.div key="pending" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-8 text-center">
                                <div className="relative w-20 h-20 mx-auto mb-4">
                                    <div className="absolute inset-0 border-4 border-gold/20 rounded-full animate-pulse" />
                                    <div className="relative bg-gold/10 w-full h-full rounded-full flex items-center justify-center">
                                        <ScanFace className="w-8 h-8 text-gold animate-pulse" />
                                    </div>
                                </div>
                                <p className="font-medium text-navy">Verifying your identity...</p>
                                <p className="text-xs text-platinum-dark mt-1">
                                    SmileID is checking your documents.{' '}
                                    {jobId && <span className="font-mono">Job: {jobId.slice(0, 16)}...</span>}
                                </p>
                                <p className="text-[10px] text-platinum-dark mt-3">This usually takes 10-30 seconds</p>
                            </motion.div>
                        )}

                        {/* ── Success ── */}
                        {step === 'SUCCESS' && (
                            <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-6 text-center">
                                <div className="w-16 h-16 bg-afia-emerald/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <UserCheck className="w-8 h-8 text-afia-emerald" />
                                </div>
                                <h3 className="text-xl font-bold text-navy mb-1">Verification Successful!</h3>
                                <p className="text-sm text-platinum-dark mb-5">
                                    Your identity has been verified. You now have access to full platform features.
                                </p>
                                <button
                                    onClick={onClose || onSuccess}
                                    className="w-full py-3 bg-afia-emerald text-white font-bold rounded-xl hover:bg-afia-emerald/90 transition-colors cursor-pointer"
                                >
                                    Continue
                                </button>
                            </motion.div>
                        )}

                        {/* ── Failed ── */}
                        {step === 'FAILED' && (
                            <motion.div key="failed" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-6 text-center">
                                <div className="w-16 h-16 bg-ruby/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <AlertTriangle className="w-8 h-8 text-ruby" />
                                </div>
                                <h3 className="text-xl font-bold text-navy mb-1">Verification Failed</h3>
                                <p className="text-sm text-platinum-dark mb-2">
                                    {rejectionReason || error || 'We could not verify your identity. Please try again.'}
                                </p>
                                <div className="flex gap-3 mt-5">
                                    <button
                                        onClick={() => { setStep('SELECT_ID'); setError(null); setRejectionReason(null) }}
                                        className="flex-1 py-3 text-sm border border-platinum rounded-xl text-navy hover:bg-platinum-light transition-colors cursor-pointer"
                                    >
                                        Try Again
                                    </button>
                                    {onClose && (
                                        <button onClick={onClose} className="flex-1 py-3 text-sm text-platinum-dark hover:text-navy transition-colors cursor-pointer">
                                            Close
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="px-6 pb-4">
                    <p className="text-[10px] text-center text-platinum-dark font-mono">
                        <Lock className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" /> Your data is encrypted and processed securely by Smile Identity
                    </p>
                </div>
            </motion.div>
        </div>
    )
}
