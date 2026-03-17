import { useState } from 'react'
import { motion } from 'framer-motion'
import PayoutQueue from './PayoutQueue'
import DisputeArbitration from './DisputeArbitration'
import VendorManagement from './VendorManagement'
import BuyerManagement from './BuyerManagement'
import AnalyticsOverview from './AnalyticsOverview'
import AuditLog from './AuditLog'
import AppShell from '../layout/AppShell'
import { useAuth } from '../../contexts/AuthContext'

// ═══════════════════════════════════════════════
// MODULE 7: ADMIN DASHBOARD (GOD MODE)
// 6-section hub: Payouts, Disputes, Vendors,
// Buyers, Analytics, Audit Log
// ═══════════════════════════════════════════════

export default function AdminDashboard() {
    const { profile, role, signOut } = useAuth()
    const [activePath, setActivePath] = useState('/admin')

    const renderContent = () => {
        switch (activePath) {
            case '/admin/disputes':
                return <DisputeArbitration />
            case '/admin/vendors':
                return <VendorManagement />
            case '/admin/buyers':
                return <BuyerManagement />
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
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
            >
                {renderContent()}
            </motion.div>
        </AppShell>
    )
}
