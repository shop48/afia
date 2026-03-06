import { Navigate } from 'react-router-dom'
import { useAuth, type UserRole } from '../../contexts/AuthContext'
import { motion } from 'framer-motion'

interface ProtectedRouteProps {
    children: React.ReactNode
    /** Roles allowed to access this route. Empty = any authenticated user. */
    allowedRoles?: UserRole[]
    /** If true, only allow unauthenticated users (for login/signup pages) */
    guestOnly?: boolean
}

/** Determine the home route for a given role */
export function getHomeRoute(role: UserRole): string {
    switch (role) {
        case 'VENDOR':
            return '/vendor'
        case 'ADMIN':
        case 'SUPER_ADMIN':
            return '/admin'
        case 'BUYER':
            return '/dashboard'
        default:
            return '/login'
    }
}

/** Full-screen loading spinner — ONLY shown during initial app boot */
function AuthLoadingScreen() {
    return (
        <div className="fixed inset-0 bg-platinum-light flex items-center justify-center z-50">
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-4"
            >
                <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                    className="w-16 h-16 rounded-2xl bg-navy flex items-center justify-center"
                >
                    <span className="font-[family-name:var(--font-heading)] text-2xl font-bold text-gold">
                        A
                    </span>
                </motion.div>
                <div className="relative w-8 h-8">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-8 h-8 border-2 border-platinum-dark border-t-gold rounded-full"
                    />
                </div>
                <p className="text-sm text-platinum-dark font-medium">Loading...</p>
            </motion.div>
        </div>
    )
}

export default function ProtectedRoute({
    children,
    allowedRoles = [],
    guestOnly = false,
}: ProtectedRouteProps) {
    const { user, role, initializing } = useAuth()

    // ONLY show loading during initial app boot — NOT during form submissions
    if (initializing) {
        return <AuthLoadingScreen />
    }

    // Guest-only routes (login, signup): redirect authenticated users to their home
    if (guestOnly) {
        if (user) {
            return <Navigate to={getHomeRoute(role)} replace />
        }
        return <>{children}</>
    }

    // Protected routes: redirect unauthenticated users to login
    if (!user) {
        return <Navigate to="/login" replace />
    }

    // Role check: if allowedRoles specified, verify user has one
    if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
        return <Navigate to={getHomeRoute(role)} replace />
    }

    return <>{children}</>
}
