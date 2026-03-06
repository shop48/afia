import { motion } from 'framer-motion'
import { Check } from 'lucide-react'

interface Step {
    label: string
    status: 'completed' | 'active' | 'upcoming'
}

interface StepTrackerProps {
    steps: Step[]
    className?: string
}

export default function StepTracker({ steps, className = '' }: StepTrackerProps) {
    return (
        <div className={`flex items-center w-full ${className}`}>
            {steps.map((step, index) => (
                <div key={index} className="flex items-center flex-1 last:flex-none">
                    {/* Step Circle */}
                    <div className="flex flex-col items-center">
                        <motion.div
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                            className={`
                w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                transition-colors duration-300
                ${step.status === 'completed'
                                    ? 'bg-neoa-emerald text-white'
                                    : step.status === 'active'
                                        ? 'bg-gold text-navy-dark ring-4 ring-gold/20'
                                        : 'bg-platinum text-platinum-dark'
                                }
              `}
                        >
                            {step.status === 'completed' ? (
                                <Check className="w-4 h-4" />
                            ) : (
                                index + 1
                            )}
                        </motion.div>
                        <span
                            className={`
                mt-2 text-[10px] font-medium text-center max-w-[70px] leading-tight
                ${step.status === 'active' ? 'text-gold-dark font-semibold' : 'text-platinum-dark'}
              `}
                        >
                            {step.label}
                        </span>
                    </div>

                    {/* Connector Line */}
                    {index < steps.length - 1 && (
                        <div className="flex-1 mx-1.5">
                            <div
                                className={`
                  h-0.5 w-full rounded-full transition-colors duration-500
                  ${step.status === 'completed' ? 'bg-neoa-emerald' : 'bg-platinum'}
                `}
                            />
                        </div>
                    )}
                </div>
            ))}
        </div>
    )
}

// Pre-configured for the Neoa 10-step order flow
StepTracker.OrderFlow = function OrderFlowTracker({ currentStep }: { currentStep: number }) {
    const ORDER_STEPS = [
        'Checkout', 'Paid', 'Vaulted', 'Fulfilling',
        'Shipped', 'In Transit', 'Delivered',
        'Buffer', 'Queued', 'Settled'
    ]

    const steps: Step[] = ORDER_STEPS.map((label, i) => ({
        label,
        status: i < currentStep ? 'completed' : i === currentStep ? 'active' : 'upcoming',
    }))

    return <StepTracker steps={steps} />
}
