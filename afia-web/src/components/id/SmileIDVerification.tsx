
import { useState } from 'react'
import { ScanFace, UserCheck, AlertTriangle } from 'lucide-react'

interface SmileIDProps {
    userId: string
    onSuccess: () => void
}

export default function SmileIDVerification({ userId, onSuccess }: SmileIDProps) {
    const [step, setStep] = useState<'START' | 'SCANNING' | 'SUCCESS' | 'FAILED'>('START')

    const startVerification = () => {
        setStep('SCANNING')
        setTimeout(() => {
            // Simulate random outcome (90% success)
            const isSuccess = Math.random() > 0.1
            setStep(isSuccess ? 'SUCCESS' : 'FAILED')
            if (isSuccess) onSuccess()
        }, 3000)
    }

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm text-center relative overflow-hidden">
                {step === 'START' && (
                    <div className="space-y-4">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto text-blue-600">
                            <ScanFace className="w-8 h-8" />
                        </div>
                        <h2 className="text-xl font-bold">Identity Verification</h2>
                        <p className="text-gray-500 text-sm">
                            We need to verify your identity before you can process high-value transactions.
                        </p>
                        <button
                            onClick={startVerification}
                            className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition"
                        >
                            Start Verification
                        </button>
                    </div>
                )}

                {step === 'SCANNING' && (
                    <div className="space-y-4 py-8">
                        <div className="relative w-24 h-24 mx-auto">
                            <div className="absolute inset-0 border-4 border-blue-200 rounded-full animate-ping"></div>
                            <div className="relative bg-blue-500 w-full h-full rounded-full flex items-center justify-center text-white">
                                <ScanFace className="w-10 h-10 animate-pulse" />
                            </div>
                        </div>
                        <p className="font-medium animate-pulse">Verifying Biometrics...</p>
                    </div>
                )}

                {step === 'SUCCESS' && (
                    <div className="space-y-4 py-4">
                        <UserCheck className="w-16 h-16 text-green-500 mx-auto" />
                        <h2 className="text-xl font-bold text-green-700">Verification Successful</h2>
                        <p className="text-gray-500 text-sm">Your identity has been verified by SmileID.</p>
                        <button
                            onClick={() => window.location.reload()} // Just close/reload for demo
                            className="w-full bg-green-600 text-white font-semibold py-3 rounded-lg"
                        >
                            Close
                        </button>
                    </div>
                )}

                {step === 'FAILED' && (
                    <div className="space-y-4 py-4">
                        <AlertTriangle className="w-16 h-16 text-red-500 mx-auto" />
                        <h2 className="text-xl font-bold text-red-700">Verification Failed</h2>
                        <p className="text-gray-500 text-sm">We could not verify your identity. Please try again.</p>
                        <button
                            onClick={() => setStep('START')}
                            className="w-full bg-gray-200 text-gray-800 font-semibold py-3 rounded-lg hover:bg-gray-300"
                        >
                            Try Again
                        </button>
                    </div>
                )}

                <div className="mt-6 text-xs text-gray-400 font-mono">Powered by Smile Identity</div>
            </div>
        </div>
    )
}
