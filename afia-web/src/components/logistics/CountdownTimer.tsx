import { useState, useEffect, useRef } from 'react'
import { AlarmClock, AlertTriangle } from 'lucide-react'

interface CountdownTimerProps {
    /** ISO date string for the target time */
    targetDate: string
    /** Optional: label shown above the timer */
    label?: string
    /** Optional: callback when timer expires */
    onExpire?: () => void
}

interface TimeLeft {
    hours: number
    minutes: number
    seconds: number
    total: number
}

function calcTimeLeft(target: string): TimeLeft {
    const diff = new Date(target).getTime() - Date.now()
    if (diff <= 0) return { hours: 0, minutes: 0, seconds: 0, total: 0 }

    return {
        hours: Math.floor(diff / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
        total: diff,
    }
}

function pad(n: number): string {
    return n.toString().padStart(2, '0')
}

export default function CountdownTimer({ targetDate, label, onExpire }: CountdownTimerProps) {
    const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => calcTimeLeft(targetDate))
    const expiredRef = useRef(false)

    useEffect(() => {
        // Reset expiredRef when target changes
        expiredRef.current = false

        const interval = setInterval(() => {
            const tl = calcTimeLeft(targetDate)
            setTimeLeft(tl)

            if (tl.total <= 0 && !expiredRef.current) {
                expiredRef.current = true
                onExpire?.()
                clearInterval(interval)
            }
        }, 1000)

        return () => clearInterval(interval)
    }, [targetDate, onExpire])

    const isExpired = timeLeft.total <= 0
    const isUrgent = timeLeft.total > 0 && timeLeft.total < 24 * 60 * 60 * 1000 // < 24h

    return (
        <div
            className={`inline-flex flex-col items-center gap-1.5 px-5 py-3 rounded-xl border ${isExpired
                ? 'bg-red-50 border-red-200'
                : isUrgent
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-emerald-50 border-emerald-200'
                }`}
        >
            {label && (
                <span className="text-xs font-medium uppercase tracking-wider text-platinum-dark">
                    {label}
                </span>
            )}

            {isExpired ? (
                <div className="flex items-center gap-2 text-xl font-semibold text-red-600">
                    <AlarmClock className="w-7 h-7" />
                    <span>Expired</span>
                </div>
            ) : (
                <div className="flex items-baseline gap-0.5 tabular-nums">
                    <div className="flex items-baseline gap-px">
                        <span className={`text-3xl font-bold min-w-[2ch] text-center ${isUrgent ? 'text-amber-600' : 'text-navy'}`}>
                            {pad(timeLeft.hours)}
                        </span>
                        <span className="text-xs text-platinum-dark font-medium">h</span>
                    </div>
                    <span className={`text-2xl font-bold mx-0.5 ${isUrgent ? 'text-amber-400' : 'text-platinum-dark'}`}>:</span>
                    <div className="flex items-baseline gap-px">
                        <span className={`text-3xl font-bold min-w-[2ch] text-center ${isUrgent ? 'text-amber-600' : 'text-navy'}`}>
                            {pad(timeLeft.minutes)}
                        </span>
                        <span className="text-xs text-platinum-dark font-medium">m</span>
                    </div>
                    <span className={`text-2xl font-bold mx-0.5 ${isUrgent ? 'text-amber-400' : 'text-platinum-dark'}`}>:</span>
                    <div className="flex items-baseline gap-px">
                        <span className={`text-3xl font-bold min-w-[2ch] text-center ${isUrgent ? 'text-amber-600' : 'text-navy'}`}>
                            {pad(timeLeft.seconds)}
                        </span>
                        <span className="text-xs text-platinum-dark font-medium">s</span>
                    </div>
                </div>
            )}

            {isUrgent && !isExpired && (
                <p className="text-xs text-amber-600 font-medium m-0">
                    <AlertTriangle className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" /> Less than 24 hours remaining
                </p>
            )}
        </div>
    )
}
