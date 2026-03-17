import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'
import {
    ScanFace, UserCheck, AlertTriangle, Loader2,
    Camera, Upload, ChevronRight, X, ShieldCheck, FileText, Lock,
    Globe, ChevronDown, RotateCcw, CheckCircle2
} from 'lucide-react'

// ════════════════════════════════════════════
// MODULE 8: REAL SMILEID KYC VERIFICATION
// Multi-country support + Real-time selfie capture
// Powered by SmileID Enhanced & Biometric KYC
// ════════════════════════════════════════════

type KycStep = 'SELECT_COUNTRY' | 'SELECT_ID' | 'ENTER_DETAILS' | 'DOCUMENT_UPLOAD' | 'SELFIE' | 'SUBMITTING' | 'PENDING' | 'SUCCESS' | 'FAILED'

// ── SmileID supported countries & ID types (from official docs) ──
// Source: https://docs.usesmileid.com/supported-id-types/for-individuals-kyc/backed-by-id-authority
interface IdTypeConfig {
    value: string
    label: string
    requiresSelfie?: boolean
    requiresName?: boolean
    requiresDob?: boolean
    placeholder?: string
    formatHint?: string
    primary?: boolean  // shown prominently vs. in "More options"
}

interface CountryConfig {
    code: string
    name: string
    flag: string
    idTypes: IdTypeConfig[]
}

const SUPPORTED_COUNTRIES: CountryConfig[] = [
    {
        code: 'NG',
        name: 'Nigeria',
        flag: '🇳🇬',
        idTypes: [
            { value: 'BVN', label: 'Bank Verification Number (BVN)', placeholder: '22212345678', formatHint: '11 digits', primary: true },
            { value: 'NIN_V2', label: 'National Identity Number (NIN)', placeholder: '12345678901', formatHint: '11 digits', primary: true },
            { value: 'PHONE_NUMBER', label: 'Phone Number', placeholder: '08012345678', formatHint: '11 digits starting with 0', primary: true },
            { value: 'VOTER_ID', label: 'Voter\'s Card', placeholder: '1234567890123456789', formatHint: '19 characters' },
            { value: 'NIN_SLIP', label: 'NIN Slip (with photo)', placeholder: '12345678901', formatHint: '11 digits', requiresSelfie: true },
            { value: 'V_NIN', label: 'Virtual NIN (vNIN)', placeholder: '1234567890123456', formatHint: '16 digits' },
        ],
    },
    {
        code: 'GH',
        name: 'Ghana',
        flag: '🇬🇭',
        idTypes: [
            { value: 'GHANA_CARD', label: 'Ghana Card', placeholder: 'GHA-123456789-0', formatHint: 'GHA-XXXXXXXXX-X', primary: true, requiresSelfie: true },
            { value: 'GHANA_CARD_NO_PHOTO', label: 'Ghana Card (no photo)', placeholder: 'GHA-123456789-0', formatHint: 'GHA-XXXXXXXXX-X', primary: true },
            { value: 'VOTER_ID', label: 'Voter ID', placeholder: '1234567890', formatHint: '10 digits' },
            { value: 'PASSPORT', label: 'Passport', placeholder: 'G1234567', formatHint: 'Letter + 7 digits' },
        ],
    },
    {
        code: 'KE',
        name: 'Kenya',
        flag: '🇰🇪',
        idTypes: [
            { value: 'NATIONAL_ID', label: 'National ID', placeholder: '12345678', formatHint: '7-8 digits', primary: true },
            { value: 'NATIONAL_ID_NO_PHOTO', label: 'National ID (no photo)', placeholder: '12345678', formatHint: '7-8 digits', primary: true },
            { value: 'PASSPORT', label: 'Passport', placeholder: 'A12345678', formatHint: 'Letter + 8 digits' },
            { value: 'ALIEN_CARD', label: 'Alien Card', placeholder: '123456', formatHint: '6 digits' },
            { value: 'KRA_PIN', label: 'KRA Tax PIN', placeholder: '12345678', formatHint: '8 digits' },
        ],
    },
    {
        code: 'ZA',
        name: 'South Africa',
        flag: '🇿🇦',
        idTypes: [
            { value: 'NATIONAL_ID', label: 'National ID', placeholder: '1234567890123', formatHint: '13 digits', primary: true },
            { value: 'NATIONAL_ID_NO_PHOTO', label: 'National ID (no photo)', placeholder: '1234567890123', formatHint: '13 digits' },
        ],
    },
    {
        code: 'UG',
        name: 'Uganda',
        flag: '🇺🇬',
        idTypes: [
            { value: 'NATIONAL_ID_NO_PHOTO', label: 'National ID', placeholder: '12345678901234', formatHint: '14 digits', primary: true },
        ],
    },
    {
        code: 'CI',
        name: 'Côte d\'Ivoire',
        flag: '🇨🇮',
        idTypes: [
            { value: 'NATIONAL_ID_NO_PHOTO', label: 'National ID', placeholder: '12345678901', formatHint: '11 digits', primary: true },
            { value: 'RESIDENT_ID_NO_PHOTO', label: 'Resident ID', placeholder: '12345678901', formatHint: '11 digits' },
        ],
    },
    {
        code: 'ZM',
        name: 'Zambia',
        flag: '🇿🇲',
        idTypes: [
            { value: 'TPIN', label: 'Tax PIN (TPIN)', placeholder: '1234567890', formatHint: '10 digits', primary: true },
        ],
    },
]

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787'

// Selfie quality constraints
const SELFIE_MAX_SIZE_MB = 3
const SELFIE_QUALITY = 0.85
const SELFIE_MIN_WIDTH = 400
const SELFIE_MIN_HEIGHT = 400

interface SmileIDProps {
    onSuccess: () => void
    onClose?: () => void
}

export default function SmileIDVerification({ onSuccess, onClose }: SmileIDProps) {
    const { session } = useAuth()
    const [step, setStep] = useState<KycStep>('SELECT_COUNTRY')
    const [selectedCountry, setSelectedCountry] = useState<CountryConfig | null>(null)
    const [idType, setIdType] = useState('')
    const [idTypeConfig, setIdTypeConfig] = useState<IdTypeConfig | null>(null)
    const [showMoreIdTypes, setShowMoreIdTypes] = useState(false)
    const [idNumber, setIdNumber] = useState('')
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [dob, setDob] = useState('')
    const [selfieImage, setSelfieImage] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [jobId, setJobId] = useState<string | null>(null)
    const [rejectionReason, setRejectionReason] = useState<string | null>(null)

    // International document verification state
    const [isInternational, setIsInternational] = useState(false)
    const [internationalCountryCode, setInternationalCountryCode] = useState('')
    const [idDocumentFrontImage, setIdDocumentFrontImage] = useState<string | null>(null)
    const [idDocumentBackImage, setIdDocumentBackImage] = useState<string | null>(null)
    const docFrontInputRef = useRef<HTMLInputElement>(null)
    const docBackInputRef = useRef<HTMLInputElement>(null)

    // Camera refs
    const fileInputRef = useRef<HTMLInputElement>(null)
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [showCamera, setShowCamera] = useState(false)
    const [stream, setStream] = useState<MediaStream | null>(null)
    const [cameraCountdown, setCameraCountdown] = useState<number | null>(null)
    const [cameraReady, setCameraReady] = useState(false)

    // Polling cleanup ref
    const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const isMountedRef = useRef(true)

    // ── Cleanup on unmount ──
    useEffect(() => {
        isMountedRef.current = true
        return () => {
            isMountedRef.current = false
            if (pollTimerRef.current) {
                clearTimeout(pollTimerRef.current)
                pollTimerRef.current = null
            }
            if (countdownTimerRef.current) {
                clearInterval(countdownTimerRef.current)
                countdownTimerRef.current = null
            }
            if (stream) {
                stream.getTracks().forEach(t => t.stop())
            }
        }
    }, [])

    // ── Get ID types for current country ──
    const primaryIdTypes = selectedCountry?.idTypes.filter(t => t.primary) || []
    const secondaryIdTypes = selectedCountry?.idTypes.filter(t => !t.primary) || []

    // ── Submit KYC to backend ──
    const submitKyc = useCallback(async () => {
        if (!session?.access_token || !selectedCountry) {
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
                    // Common
                    country: isInternational ? internationalCountryCode.toUpperCase() : selectedCountry.code,
                    firstName: firstName.trim() || undefined,
                    lastName: lastName.trim() || undefined,
                    selfieImage: selfieImage || undefined,
                    // African Enhanced KYC
                    ...(isInternational ? {} : {
                        idType,
                        idNumber: idNumber.trim(),
                        dob: dob || undefined,
                    }),
                    // International Document Verification
                    ...(isInternational ? {
                        idDocumentFrontImage: idDocumentFrontImage || undefined,
                        idDocumentBackImage: idDocumentBackImage || undefined,
                    } : {}),
                }),
            })

            const data = await response.json() as { message?: string; job_id?: string; error?: string }

            if (!response.ok) {
                throw new Error(data.error || 'KYC submission failed')
            }

            setJobId(data.job_id || null)
            setStep('PENDING')

            pollKycStatus()
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Submission failed'
            setError(message)
            setStep('FAILED')
        }
    }, [session, selectedCountry, isInternational, internationalCountryCode, idType, idNumber, firstName, lastName, dob, selfieImage, idDocumentFrontImage, idDocumentBackImage])

    // ── Poll for KYC status ──
    const pollKycStatus = useCallback(async () => {
        if (!session?.access_token) return

        let attempts = 0
        const maxAttempts = 20

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
                // Ignore poll errors
            }

            if (attempts < maxAttempts && isMountedRef.current) {
                pollTimerRef.current = setTimeout(poll, 6000)
            }
        }

        pollTimerRef.current = setTimeout(poll, 5000)
    }, [session, onSuccess])

    // ── Camera handling — enhanced with countdown + face guide ──
    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'user',
                    width: { ideal: 640, min: SELFIE_MIN_WIDTH },
                    height: { ideal: 640, min: SELFIE_MIN_HEIGHT },
                    aspectRatio: { ideal: 1 },
                },
            })
            setStream(mediaStream)
            setShowCamera(true)
            setCameraReady(false)

            // Wait a moment for the video feed to stabilize
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream
                    videoRef.current.onloadeddata = () => setCameraReady(true)
                }
            }, 200)
        } catch {
            setError('Camera access denied. Please allow camera access or upload a photo instead.')
        }
    }

    const captureWithCountdown = () => {
        setCameraCountdown(3)

        countdownTimerRef.current = setInterval(() => {
            setCameraCountdown(prev => {
                if (prev === null || prev <= 1) {
                    if (countdownTimerRef.current) {
                        clearInterval(countdownTimerRef.current)
                        countdownTimerRef.current = null
                    }
                    capturePhoto()
                    return null
                }
                return prev - 1
            })
        }, 1000)
    }

    const capturePhoto = () => {
        if (!videoRef.current) return

        const canvas = canvasRef.current || document.createElement('canvas')
        const vw = videoRef.current.videoWidth
        const vh = videoRef.current.videoHeight

        // Crop to square (centered) for consistent headshot framing
        const size = Math.min(vw, vh)
        const sx = (vw - size) / 2
        const sy = (vh - size) / 2

        canvas.width = 640
        canvas.height = 640
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        ctx.drawImage(videoRef.current, sx, sy, size, size, 0, 0, 640, 640)

        const base64 = canvas.toDataURL('image/jpeg', SELFIE_QUALITY).split(',')[1]

        // Check file size
        const sizeBytes = atob(base64).length
        if (sizeBytes > SELFIE_MAX_SIZE_MB * 1024 * 1024) {
            setError(`Photo is too large (${(sizeBytes / 1024 / 1024).toFixed(1)}MB). Maximum ${SELFIE_MAX_SIZE_MB}MB. Try moving further from the camera.`)
            return
        }

        setSelfieImage(base64)
        stopCamera()
    }

    const stopCamera = () => {
        if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current)
            countdownTimerRef.current = null
        }
        setCameraCountdown(null)
        if (stream) {
            stream.getTracks().forEach(t => t.stop())
            setStream(null)
        }
        setShowCamera(false)
        setCameraReady(false)
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (file.size > SELFIE_MAX_SIZE_MB * 1024 * 1024) {
            setError(`File too large. Maximum ${SELFIE_MAX_SIZE_MB}MB.`)
            return
        }
        if (!file.type.startsWith('image/')) {
            setError('Please upload an image file (JPEG, PNG)')
            return
        }
        const reader = new FileReader()
        reader.onload = () => {
            const base64 = (reader.result as string).split(',')[1]
            setSelfieImage(base64)
        }
        reader.readAsDataURL(file)
    }

    // ── Handle document photo upload (international) ──
    const handleDocUpload = (type: 'front' | 'back') => (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (file.size > SELFIE_MAX_SIZE_MB * 1024 * 1024) {
            setError(`File too large. Maximum ${SELFIE_MAX_SIZE_MB}MB.`)
            return
        }
        if (!file.type.startsWith('image/')) {
            setError('Please upload an image file (JPEG, PNG)')
            return
        }
        const reader = new FileReader()
        reader.onload = () => {
            const base64 = (reader.result as string).split(',')[1]
            if (type === 'front') setIdDocumentFrontImage(base64)
            else setIdDocumentBackImage(base64)
        }
        reader.readAsDataURL(file)
    }

    // ── Select country ──
    const selectCountry = (country: CountryConfig) => {
        setSelectedCountry(country)
        setIsInternational(false)
        setIdType('')
        setIdTypeConfig(null)
        setShowMoreIdTypes(false)
        setStep('SELECT_ID')
    }

    // ── Select international (non-listed) country ──
    const selectInternational = () => {
        setSelectedCountry(null)
        setIsInternational(true)
        setIdType('')
        setIdTypeConfig(null)
        setStep('ENTER_DETAILS')
    }

    // ── Select ID type ──
    const selectIdType = (config: IdTypeConfig) => {
        setIdType(config.value)
        setIdTypeConfig(config)
        setStep('ENTER_DETAILS')
    }

    // ── Check if selfie is required for this ID type ──
    const selfieRequired = isInternational ? true : idTypeConfig?.requiresSelfie === true

    // ── Progress steps (different for international vs African) ──
    const progressSteps = isInternational
        ? ['SELECT_COUNTRY', 'ENTER_DETAILS', 'DOCUMENT_UPLOAD', 'SELFIE']
        : ['SELECT_COUNTRY', 'SELECT_ID', 'ENTER_DETAILS', 'SELFIE']

    // ── Render ──
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden max-h-[90vh] flex flex-col"
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-navy to-navy-dark p-5 text-white shrink-0">
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
                    {/* Progress indicator */}
                    <div className="flex gap-1.5 mt-3">
                        {progressSteps.map((s, i) => (
                            <div
                                key={s}
                                className={`h-1 rounded-full flex-1 transition-all duration-300 ${
                                    progressSteps.indexOf(step) >= i
                                        || ['SUBMITTING', 'PENDING', 'SUCCESS'].includes(step)
                                        ? 'bg-gold'
                                        : 'bg-white/20'
                                }`}
                            />
                        ))}
                    </div>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    <AnimatePresence mode="wait">
                        {/* ── Step 0: Select Country ── */}
                        {step === 'SELECT_COUNTRY' && (
                            <motion.div key="country" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                <div className="flex items-center gap-2 mb-3">
                                    <Globe className="w-4 h-4 text-gold" />
                                    <p className="text-sm font-medium text-navy">Select your country</p>
                                </div>
                                <p className="text-xs text-platinum-dark mb-4">
                                    We verify identities globally. Select your country below.
                                </p>
                                <div className="space-y-2">
                                    {SUPPORTED_COUNTRIES.map(country => (
                                        <button
                                            key={country.code}
                                            onClick={() => selectCountry(country)}
                                            className="w-full flex items-center justify-between p-3.5 rounded-xl border border-platinum hover:border-gold/50 hover:bg-gold/5 transition-all cursor-pointer group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-2xl">{country.flag}</span>
                                                <div className="text-left">
                                                    <span className="text-sm font-medium text-navy block">{country.name}</span>
                                                    <span className="text-[10px] text-platinum-dark">
                                                        {country.idTypes.length} ID type{country.idTypes.length !== 1 ? 's' : ''} supported
                                                    </span>
                                                </div>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-platinum-dark group-hover:text-gold transition-colors" />
                                        </button>
                                    ))}
                                </div>

                                {/* International / Other Country option */}
                                <div className="mt-4 pt-4 border-t border-platinum/50">
                                    <button
                                        onClick={selectInternational}
                                        className="w-full flex items-center justify-between p-3.5 rounded-xl border border-dashed border-gold/40 hover:border-gold hover:bg-gold/5 transition-all cursor-pointer group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">🌍</span>
                                            <div className="text-left">
                                                <span className="text-sm font-medium text-navy block">Other Country</span>
                                                <span className="text-[10px] text-platinum-dark">
                                                    Passport or ID card + selfie verification
                                                </span>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-platinum-dark group-hover:text-gold transition-colors" />
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* ── Step 1: Select ID Type ── */}
                        {step === 'SELECT_ID' && selectedCountry && (
                            <motion.div key="selectid" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-lg">{selectedCountry.flag}</span>
                                    <p className="text-sm font-medium text-navy">{selectedCountry.name} — Select ID type</p>
                                </div>
                                <p className="text-xs text-platinum-dark mb-4">
                                    Choose your preferred identification document:
                                </p>

                                {/* Primary (recommended) ID types */}
                                <div className="space-y-2 mb-3">
                                    {primaryIdTypes.map(type => (
                                        <button
                                            key={type.value}
                                            onClick={() => selectIdType(type)}
                                            className="w-full flex items-center justify-between p-3 rounded-xl border border-platinum hover:border-gold/50 hover:bg-gold/5 transition-all cursor-pointer group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <FileText className="w-4 h-4 text-gold" />
                                                <div className="text-left">
                                                    <span className="text-sm font-medium text-navy">{type.label}</span>
                                                    {type.requiresSelfie && (
                                                        <span className="ml-2 text-[9px] bg-gold/10 text-gold px-1.5 py-0.5 rounded-full">
                                                            📸 Selfie required
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-platinum-dark group-hover:text-gold" />
                                        </button>
                                    ))}
                                </div>

                                {/* Secondary (optional) ID types */}
                                {secondaryIdTypes.length > 0 && (
                                    <>
                                        <button
                                            onClick={() => setShowMoreIdTypes(!showMoreIdTypes)}
                                            className="w-full flex items-center justify-center gap-1 py-2 text-xs text-platinum-dark hover:text-navy transition-colors cursor-pointer"
                                        >
                                            <span>{showMoreIdTypes ? 'Show less' : `More options (${secondaryIdTypes.length})`}</span>
                                            <ChevronDown className={`w-3 h-3 transition-transform ${showMoreIdTypes ? 'rotate-180' : ''}`} />
                                        </button>

                                        <AnimatePresence>
                                            {showMoreIdTypes && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="space-y-2 pb-1">
                                                        {secondaryIdTypes.map(type => (
                                                            <button
                                                                key={type.value}
                                                                onClick={() => selectIdType(type)}
                                                                className="w-full flex items-center justify-between p-3 rounded-xl border border-platinum/60 hover:border-gold/40 transition-all cursor-pointer group opacity-80 hover:opacity-100"
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <FileText className="w-4 h-4 text-platinum-dark" />
                                                                    <span className="text-sm text-navy">{type.label}</span>
                                                                </div>
                                                                <ChevronRight className="w-4 h-4 text-platinum-dark group-hover:text-gold" />
                                                            </button>
                                                        ))}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </>
                                )}

                                <button
                                    onClick={() => { setStep('SELECT_COUNTRY'); setSelectedCountry(null) }}
                                    className="w-full mt-3 py-2.5 text-sm border border-platinum rounded-xl text-navy hover:bg-platinum-light transition-colors cursor-pointer"
                                >
                                    ← Change country
                                </button>
                            </motion.div>
                        )}

                        {/* ── Step 2: Enter Details ── */}
                        {step === 'ENTER_DETAILS' && (idTypeConfig || isInternational) && (
                            <motion.div key="details" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                {isInternational ? (
                                    <>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-lg">🌍</span>
                                            <p className="text-sm font-medium text-navy">International Verification</p>
                                        </div>
                                        <p className="text-xs text-platinum-dark mb-4">
                                            Enter your details. You'll need to upload a photo of your passport or ID card next.
                                        </p>
                                    </>
                                ) : (
                                    <p className="text-sm text-platinum-dark mb-4">
                                        Enter your <span className="font-semibold text-navy">{idTypeConfig!.label}</span> details:
                                    </p>
                                )}

                                <div className="space-y-3">
                                    {/* Country code input — international only */}
                                    {isInternational && (
                                        <div>
                                            <label className="text-xs font-medium text-navy block mb-1">Country Code *</label>
                                            <input
                                                type="text"
                                                value={internationalCountryCode}
                                                onChange={e => setInternationalCountryCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2))}
                                                placeholder="US, GB, DE, FR..."
                                                className="w-full px-4 py-3 border border-platinum rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold uppercase"
                                                maxLength={2}
                                            />
                                            <p className="text-[10px] text-platinum-dark mt-1">2-letter ISO country code (e.g., US for United States, GB for United Kingdom)</p>
                                        </div>
                                    )}

                                    {/* ID number — African only */}
                                    {!isInternational && idTypeConfig && (
                                        <div>
                                            <label className="text-xs font-medium text-navy block mb-1">
                                                {idTypeConfig.label} Number *
                                            </label>
                                            <input
                                                type="text"
                                                value={idNumber}
                                                onChange={e => setIdNumber(e.target.value)}
                                                placeholder={idTypeConfig.placeholder || 'Enter ID number'}
                                                className="w-full px-4 py-3 border border-platinum rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
                                                maxLength={30}
                                            />
                                            {idTypeConfig.formatHint && (
                                                <p className="text-[10px] text-platinum-dark mt-1">Format: {idTypeConfig.formatHint}</p>
                                            )}
                                        </div>
                                    )}

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

                                    {/* DOB — African only */}
                                    {!isInternational && (
                                        <div>
                                            <label className="text-xs font-medium text-navy block mb-1">Date of Birth</label>
                                            <input
                                                type="date"
                                                value={dob}
                                                onChange={e => setDob(e.target.value)}
                                                className="w-full px-4 py-3 border border-platinum rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
                                            />
                                        </div>
                                    )}
                                </div>

                                {error && (
                                    <div className="mt-3 p-2 bg-ruby/5 border border-ruby/20 rounded-lg text-xs text-ruby flex items-center gap-2">
                                        <AlertTriangle className="w-3 h-3 shrink-0" /> {error}
                                    </div>
                                )}

                                <div className="flex gap-3 mt-5">
                                    <button
                                        onClick={() => setStep(isInternational ? 'SELECT_COUNTRY' : 'SELECT_ID')}
                                        className="flex-1 py-3 text-sm border border-platinum rounded-xl text-navy hover:bg-platinum-light transition-colors cursor-pointer"
                                    >
                                        Back
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (isInternational) {
                                                if (!internationalCountryCode || internationalCountryCode.length !== 2) {
                                                    setError('Please enter a valid 2-letter country code')
                                                    return
                                                }
                                                setError(null)
                                                setStep('DOCUMENT_UPLOAD')
                                            } else {
                                                if (!idNumber.trim() || idNumber.trim().length < 5) {
                                                    setError(`Please enter a valid ${idTypeConfig!.label} number`)
                                                    return
                                                }
                                                setError(null)
                                                setStep('SELFIE')
                                            }
                                        }}
                                        className="flex-1 py-3 text-sm bg-gold text-navy-dark font-bold rounded-xl hover:bg-gold-light transition-colors cursor-pointer"
                                    >
                                        Next
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* ── Step 2b: Document Upload (International only) ── */}
                        {step === 'DOCUMENT_UPLOAD' && isInternational && (
                            <motion.div key="docupload" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                <div className="flex items-center gap-2 mb-1">
                                    <FileText className="w-4 h-4 text-gold" />
                                    <p className="text-sm font-medium text-navy">Upload ID Document</p>
                                </div>
                                <p className="text-xs text-platinum-dark mb-4">
                                    Upload a clear photo of your <span className="font-semibold text-navy">passport or national ID card</span>. We use OCR to verify your identity.
                                </p>

                                {/* Front of document */}
                                <div className="mb-4">
                                    <label className="text-xs font-medium text-navy block mb-2">Front of ID *</label>
                                    {idDocumentFrontImage ? (
                                        <div className="relative rounded-xl overflow-hidden border-2 border-afia-emerald/30">
                                            <img
                                                src={`data:image/jpeg;base64,${idDocumentFrontImage}`}
                                                alt="ID Front"
                                                className="w-full h-40 object-cover"
                                            />
                                            <div className="absolute top-2 left-2 flex items-center gap-1 bg-afia-emerald/90 text-white text-[10px] px-2 py-1 rounded-full">
                                                <CheckCircle2 className="w-3 h-3" /> Front uploaded
                                            </div>
                                            <button
                                                onClick={() => setIdDocumentFrontImage(null)}
                                                className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-sm cursor-pointer"
                                            >
                                                <X className="w-4 h-4 text-ruby" />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => docFrontInputRef.current?.click()}
                                            className="w-full flex flex-col items-center gap-2 p-6 border-2 border-dashed border-gold/40 rounded-xl hover:border-gold hover:bg-gold/5 transition-all cursor-pointer"
                                        >
                                            <Upload className="w-6 h-6 text-gold" />
                                            <span className="text-xs text-navy font-medium">Upload front of passport / ID</span>
                                            <span className="text-[9px] text-platinum-dark">JPEG or PNG, max {SELFIE_MAX_SIZE_MB}MB</span>
                                        </button>
                                    )}
                                    <input ref={docFrontInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleDocUpload('front')} />
                                </div>

                                {/* Back of document (optional) */}
                                <div className="mb-4">
                                    <label className="text-xs font-medium text-navy block mb-2">Back of ID <span className="text-platinum-dark font-normal">(optional)</span></label>
                                    {idDocumentBackImage ? (
                                        <div className="relative rounded-xl overflow-hidden border-2 border-afia-emerald/30">
                                            <img
                                                src={`data:image/jpeg;base64,${idDocumentBackImage}`}
                                                alt="ID Back"
                                                className="w-full h-40 object-cover"
                                            />
                                            <div className="absolute top-2 left-2 flex items-center gap-1 bg-afia-emerald/90 text-white text-[10px] px-2 py-1 rounded-full">
                                                <CheckCircle2 className="w-3 h-3" /> Back uploaded
                                            </div>
                                            <button
                                                onClick={() => setIdDocumentBackImage(null)}
                                                className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-sm cursor-pointer"
                                            >
                                                <X className="w-4 h-4 text-ruby" />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => docBackInputRef.current?.click()}
                                            className="w-full flex flex-col items-center gap-2 p-4 border-2 border-dashed border-platinum/60 rounded-xl hover:border-gold/40 transition-colors cursor-pointer"
                                        >
                                            <Upload className="w-5 h-5 text-platinum-dark" />
                                            <span className="text-xs text-platinum-dark">Upload back (if applicable)</span>
                                        </button>
                                    )}
                                    <input ref={docBackInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleDocUpload('back')} />
                                </div>

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
                                        onClick={() => {
                                            if (!idDocumentFrontImage) {
                                                setError('Please upload the front of your ID document')
                                                return
                                            }
                                            setError(null)
                                            setStep('SELFIE')
                                        }}
                                        disabled={!idDocumentFrontImage}
                                        className="flex-1 py-3 text-sm bg-gold text-navy-dark font-bold rounded-xl hover:bg-gold-light transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Next → Selfie
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* ── Step 3: Selfie / Headshot ── */}
                        {step === 'SELFIE' && (
                            <motion.div key="selfie" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                <p className="text-sm text-platinum-dark mb-2">
                                    {selfieRequired
                                        ? <>A <span className="font-semibold text-navy">live headshot</span> is required for this ID type.</>
                                        : <>Take a <span className="font-semibold text-navy">live headshot</span> or upload a clear passport-style photo. This step is optional but improves verification speed.</>
                                    }
                                </p>

                                {/* Selfie tips */}
                                <div className="bg-platinum-light/50 rounded-lg p-3 mb-4">
                                    <p className="text-[10px] font-semibold text-navy mb-1.5">📸 Photo tips:</p>
                                    <ul className="text-[10px] text-platinum-dark space-y-0.5 list-disc list-inside">
                                        <li>Face forward, both eyes visible</li>
                                        <li>Good lighting, no shadows on face</li>
                                        <li>Remove glasses, hats, or face coverings</li>
                                        <li>Neutral expression, mouth closed</li>
                                    </ul>
                                </div>

                                {showCamera ? (
                                    <div className="relative mb-4">
                                        {/* Video with oval face guide overlay */}
                                        <div className="relative rounded-xl overflow-hidden border-2 border-gold/30 bg-black">
                                            <video
                                                ref={videoRef}
                                                autoPlay
                                                playsInline
                                                muted
                                                className="w-full aspect-square object-cover"
                                                style={{ transform: 'scaleX(-1)' }}
                                            />

                                            {/* Oval face guide overlay */}
                                            <div className="absolute inset-0 pointer-events-none">
                                                <svg viewBox="0 0 100 100" className="w-full h-full">
                                                    {/* Semi-transparent mask with oval cutout */}
                                                    <defs>
                                                        <mask id="face-guide">
                                                            <rect width="100" height="100" fill="white" />
                                                            <ellipse cx="50" cy="45" rx="22" ry="30" fill="black" />
                                                        </mask>
                                                    </defs>
                                                    <rect width="100" height="100" fill="rgba(0,0,0,0.4)" mask="url(#face-guide)" />
                                                    {/* Oval border */}
                                                    <ellipse
                                                        cx="50" cy="45" rx="22" ry="30"
                                                        fill="none" stroke="#C8A45C" strokeWidth="0.5" strokeDasharray="3,2"
                                                        className={cameraCountdown !== null ? 'animate-pulse' : ''}
                                                    />
                                                </svg>
                                                {/* Guide text */}
                                                <div className="absolute bottom-3 left-0 right-0 text-center">
                                                    <span className="text-[10px] text-white/80 bg-black/50 px-2 py-0.5 rounded-full">
                                                        Position your face within the oval
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Countdown overlay */}
                                            {cameraCountdown !== null && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-10">
                                                    <motion.span
                                                        key={cameraCountdown}
                                                        initial={{ scale: 2, opacity: 0 }}
                                                        animate={{ scale: 1, opacity: 1 }}
                                                        className="text-6xl font-bold text-white drop-shadow-lg"
                                                    >
                                                        {cameraCountdown}
                                                    </motion.span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex gap-2 mt-3">
                                            <button
                                                onClick={captureWithCountdown}
                                                disabled={!cameraReady || cameraCountdown !== null}
                                                className="flex-1 py-3 bg-gold text-navy-dark font-bold rounded-xl text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                                            >
                                                <span className="inline-flex items-center gap-1.5">
                                                    <Camera className="w-4 h-4" />
                                                    {cameraCountdown !== null ? 'Capturing...' : cameraReady ? 'Take Photo' : 'Loading camera...'}
                                                </span>
                                            </button>
                                            <button onClick={stopCamera} className="py-3 px-4 border border-platinum rounded-xl text-sm cursor-pointer">
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : selfieImage ? (
                                    <div className="relative mb-4">
                                        <div className="rounded-xl overflow-hidden border-2 border-afia-emerald/30">
                                            <img
                                                src={`data:image/jpeg;base64,${selfieImage}`}
                                                alt="Your headshot"
                                                className="w-full aspect-square object-cover"
                                            />
                                            <div className="absolute top-2 left-2 flex items-center gap-1 bg-afia-emerald/90 text-white text-[10px] px-2 py-1 rounded-full">
                                                <CheckCircle2 className="w-3 h-3" /> Photo captured
                                            </div>
                                        </div>
                                        <div className="flex gap-2 mt-2">
                                            <button
                                                onClick={() => setSelfieImage(null)}
                                                className="flex-1 py-2 text-xs border border-platinum rounded-lg text-navy hover:bg-platinum-light transition-colors cursor-pointer inline-flex items-center justify-center gap-1"
                                            >
                                                <RotateCcw className="w-3 h-3" /> Retake
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                        <button
                                            onClick={startCamera}
                                            className="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-gold/40 rounded-xl hover:border-gold hover:bg-gold/5 transition-all cursor-pointer bg-gold/5"
                                        >
                                            <Camera className="w-8 h-8 text-gold" />
                                            <span className="text-xs text-navy font-semibold">Live Capture</span>
                                            <span className="text-[9px] text-platinum-dark">Recommended</span>
                                        </button>
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-platinum rounded-xl hover:border-gold/50 transition-colors cursor-pointer"
                                        >
                                            <Upload className="w-8 h-8 text-platinum-dark" />
                                            <span className="text-xs text-navy font-medium">Upload Photo</span>
                                            <span className="text-[9px] text-platinum-dark">Max {SELFIE_MAX_SIZE_MB}MB</span>
                                        </button>
                                        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileUpload} />
                                    </div>
                                )}

                                {/* Hidden canvas for photo processing */}
                                <canvas ref={canvasRef} className="hidden" />

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
                                        disabled={selfieRequired && !selfieImage}
                                        className="flex-1 py-3 text-sm bg-gold text-navy-dark font-bold rounded-xl hover:bg-gold-light transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {selfieImage ? '📸 Verify with Photo' : selfieRequired ? '📸 Photo required' : 'Verify ID Only'}
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
                                        onClick={() => { setStep('SELECT_COUNTRY'); setError(null); setRejectionReason(null) }}
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
                <div className="px-6 pb-4 shrink-0">
                    <p className="text-[10px] text-center text-platinum-dark font-mono">
                        <Lock className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" />Your data is encrypted and processed securely by Smile Identity
                    </p>
                </div>
            </motion.div>
        </div>
    )
}
