import { useState } from 'react'
import { motion } from 'framer-motion'
import PayoutQueue from './PayoutQueue'
import DisputeArbitration from './DisputeArbitration'
import VendorManagement from './VendorManagement'
import AnalyticsOverview from './AnalyticsOverview'
import AuditLog from './AuditLog'
import AppShell from '../layout/AppShell'
import { useAuth } from '../../contexts/AuthContext'

// ═══════════════════════════════════════════════
// MODULE 7: ADMIN DASHBOARD (GOD MODE)
// 5-section hub: Payouts, Disputes, Vendors,
// Analytics, Audit Log
// ═══════════════════════════════════════════════

// Components that use DARK theming (text-white, bg-navy-light, etc.)
const DARK_THEMED_ROUTES = ['/admin', '/admin/vendors', '/admin/analytics', '/admin/audit-log']

export default function AdminDashboard() {
    const { profile, role, signOut } = useAuth()
    const [activePath, setActivePath] = useState('/admin')

    const isDarkTheme = DARK_THEMED_ROUTES.includes(activePath)

    const renderContent = () => {
        switch (activePath) {
            case '/admin/disputes':
                return <DisputeArbitration />
            case '/admin/vendors':
                return <VendorManagement />
            case '/admin/analytics':
                return <AnalyticsOverview />
            case '/admin/audit-log':
                return <AuditLog />
            default:
                return <PayoutQueue />
        }
    }

    return (
        <AppShell
            role={role as 'BUYER' | 'VENDOR' | 'ADMIN' | 'SUPER_ADMIN'}
            activePath={activePath}
            onNavigate={setActivePath}
            userName={profile?.full_name || 'Admin'}
            onLogout={signOut}
        >
            {isDarkTheme ? (
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="-m-4 sm:-m-6 lg:-m-8 p-4 sm:p-6 lg:p-8 min-h-screen bg-gradient-to-br from-navy-dark to-navy"
                >
                    {renderContent()}
                </motion.div>
            ) : (
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                >
                    {renderContent()}
                </motion.div>
            )}
        </AppShell>
    )
}
