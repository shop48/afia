
import { useState } from 'react'
import { CreditCard, Lock, ArrowRight } from 'lucide-react'

interface PaystackProps {
    email: string
    amount: number
    onSuccess: (reference: string) => void
    onClose: () => void
}

export default function PaystackCheckout({ email, amount, onSuccess, onClose }: PaystackProps) {
    const [processing, setProcessing] = useState(false)

    const handlePay = () => {
        setProcessing(true)
        // Simulate API delay
        setTimeout(() => {
            const mockRef = `T${Math.floor(Math.random() * 1000000000 + 1)}`
            setProcessing(false)
            onSuccess(mockRef)
        }, 2000)
    }

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden font-sans">
                {/* Header */}
                <div className="bg-[#0ba4db] p-6 text-white text-center">
                    <h3 className="text-xl font-bold">Paystack Checkout</h3>
                    <p className="opacity-90 text-sm mt-1">{email}</p>
                </div>

                {/* Body */}
                <div className="p-8">
                    <div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-4">
                        <span className="text-gray-500">Amount to pay</span>
                        <span className="text-2xl font-bold text-gray-900">
                            NGN {amount.toLocaleString()}
                        </span>
                    </div>

                    <div className="space-y-4">
                        <div className="relative">
                            <CreditCard className="absolute left-3 top-3.5 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="0000 0000 0000 0000"
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0ba4db] focus:border-transparent outline-none transition-all"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <input
                                type="text"
                                placeholder="MM/YY"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0ba4db] outline-none"
                            />
                            <input
                                type="text"
                                placeholder="CVV"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0ba4db] outline-none"
                            />
                        </div>
                    </div>

                    <button
                        onClick={handlePay}
                        disabled={processing}
                        className="w-full mt-8 bg-[#3ebb5b] hover:bg-[#34a34d] text-white font-bold py-4 rounded-lg shadow-lg flex items-center justify-center transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {processing ? (
                            <span className="animate-pulse">Processing Payment...</span>
                        ) : (
                            <>
                                <Lock className="w-4 h-4 mr-2" /> Pay NGN {amount.toLocaleString()}
                            </>
                        )}
                    </button>

                    <button
                        onClick={onClose}
                        className="w-full mt-4 text-gray-500 text-sm hover:text-gray-800"
                    >
                        Cancel Payment
                    </button>

                    <div className="mt-6 flex justify-center opacity-50">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/0/0b/Paystack_Logo.png" alt="Secured by Paystack" className="h-6 object-contain" />
                    </div>
                </div>
            </div>
        </div>
    )
}
