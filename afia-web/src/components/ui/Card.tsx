import { type ReactNode } from 'react'
import { motion } from 'framer-motion'

interface CardProps {
    children: ReactNode
    className?: string
    hover?: boolean
    padding?: 'none' | 'sm' | 'md' | 'lg'
}

const paddingStyles = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
}

export default function Card({ children, className = '', hover = false, padding = 'md' }: CardProps) {
    const classes = `
        bg-white rounded-xl border border-platinum shadow-sm
        ${paddingStyles[padding]}
        ${hover ? 'cursor-pointer' : ''}
        ${className}
    `

    if (hover) {
        return (
            <motion.div
                className={classes}
                whileHover={{ y: -2, boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)' }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
                {children}
            </motion.div>
        )
    }

    return (
        <div className={classes}>
            {children}
        </div>
    )
}

// Sub-components
Card.Header = function CardHeader({ children, className = '' }: { children: ReactNode; className?: string }) {
    return (
        <div className={`border-b border-platinum pb-4 mb-4 ${className}`}>
            {children}
        </div>
    )
}

Card.Footer = function CardFooter({ children, className = '' }: { children: ReactNode; className?: string }) {
    return (
        <div className={`border-t border-platinum pt-4 mt-4 ${className}`}>
            {children}
        </div>
    )
}
