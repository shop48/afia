import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, AlertTriangle, Info, X } from 'lucide-react'

type ToastVariant = 'success' | 'error' | 'info'

interface Toast {
    id: string
    message: string
    variant: ToastVariant
}

const iconMap = {
    success: CheckCircle,
    error: AlertTriangle,
    info: Info,
}

const colorMap = {
    success: 'bg-emerald text-white',
    error: 'bg-ruby text-white',
    info: 'bg-navy text-white',
}

// Global state for toasts (simple pub/sub)
let listeners: ((toast: Toast) => void)[] = []

export function toast(message: string, variant: ToastVariant = 'info') {
    const id = Math.random().toString(36).slice(2)
    listeners.forEach(fn => fn({ id, message, variant }))
}

export default function ToastContainer() {
    const [toasts, setToasts] = useState<Toast[]>([])

    const addToast = useCallback((t: Toast) => {
        setToasts(prev => [...prev, t])
        setTimeout(() => {
            setToasts(prev => prev.filter(x => x.id !== t.id))
        }, 4000)
    }, [])

    useEffect(() => {
        listeners.push(addToast)
        return () => {
            listeners = listeners.filter(fn => fn !== addToast)
        }
    }, [addToast])

    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(x => x.id !== id))
    }

    return (
        <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 max-w-sm">
            <AnimatePresence>
                {toasts.map(t => {
                    const Icon = iconMap[t.variant]
                    return (
                        <motion.div
                            key={t.id}
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 100 }}
                            className={`
                flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg
                ${colorMap[t.variant]}
              `}
                        >
                            <Icon className="w-5 h-5 shrink-0" />
                            <span className="text-sm font-medium flex-1">{t.message}</span>
                            <button onClick={() => removeToast(t.id)} className="shrink-0 opacity-70 hover:opacity-100">
                                <X className="w-4 h-4" />
                            </button>
                        </motion.div>
                    )
                })}
            </AnimatePresence>
        </div>
    )
}
