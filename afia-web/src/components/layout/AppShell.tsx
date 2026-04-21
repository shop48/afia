import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    LayoutDashboard, ShoppingBag, Package, Shield,
    Menu, X, LogOut, ChevronRight,
    AlertTriangle, Users, BarChart3, ScrollText, Settings, UserCheck,
} from 'lucide-react'
import NotificationCenter from '../notifications/NotificationCenter'

/*
 * ═══════════════════════════════════════════════════════
 *  LAYOUT ARCHITECTURE
 *
 *  Desktop (lg+):
 *  ┌──────────┬───────────────────────────────────────┐
 *  │ SIDEBAR  │  CONTENT (flex-1, never overlaps)     │
 *  │ fixed    │  ┌─────────────────────────────────┐   │
 *  │ 260px    │  │ p-6/p-8/p-10 inner padding     │   │
 *  │          │  │                                 │   │
 *  │          │  └─────────────────────────────────┘   │
 *  └──────────┴───────────────────────────────────────┘
 *
 *  Mobile:
 *  ┌─────────────────────────────────────────────────┐
 *  │ HEADER (fixed h-14)                             │
 *  ├─────────────────────────────────────────────────┤
 *  │ CONTENT (full-width, pt-14 to clear header)     │
 *  │ ┌─────────────────────────────────────────────┐ │
 *  │ │ p-4/p-6 inner padding                      │ │
 *  │ └─────────────────────────────────────────────┘ │
 *  ├─────────────────────────────────────────────────┤
 *  │ BOTTOM NAV (fixed h-14)                         │
 *  └─────────────────────────────────────────────────┘
 *
 *  Key: The sidebar is `fixed` (out of flow), but a
 *  spacer <div> with the same width sits in the flex
 *  row to physically push the content area over.
 *  This makes it impossible for content to bleed
 *  under the sidebar, regardless of what children do.
 * ═══════════════════════════════════════════════════════
 */

interface SidebarLink {
    label: string
    icon: React.ReactNode
    path: string
    badge?: number
}

interface AppShellProps {
    children: React.ReactNode
    role?: 'BUYER' | 'VENDOR' | 'ADMIN' | 'SUPER_ADMIN'
    activePath?: string
    userName?: string
    onNavigate?: (path: string) => void
    onLogout?: () => void
}

const BUYER_LINKS: SidebarLink[] = [
    { label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, path: '/dashboard' },
    { label: 'My Orders', icon: <ShoppingBag className="w-5 h-5" />, path: '/orders' },
    { label: 'Browse', icon: <Package className="w-5 h-5" />, path: '/catalog' },
]

const VENDOR_LINKS: SidebarLink[] = [
    { label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, path: '/vendor' },
    { label: 'Products', icon: <Package className="w-5 h-5" />, path: '/vendor/products' },
    { label: 'Orders', icon: <ShoppingBag className="w-5 h-5" />, path: '/vendor/orders' },
    { label: 'Settings', icon: <Settings className="w-5 h-5" />, path: '/vendor/settings' },
]

const ADMIN_LINKS: SidebarLink[] = [
    { label: 'Payout Gate', icon: <Shield className="w-5 h-5" />, path: '/admin' },
    { label: 'Disputes', icon: <AlertTriangle className="w-5 h-5" />, path: '/admin/disputes' },
    { label: 'Vendors', icon: <Users className="w-5 h-5" />, path: '/admin/vendors' },
    { label: 'KYC Review', icon: <UserCheck className="w-5 h-5" />, path: '/admin/kyc-review' },
    { label: 'Buyers', icon: <ShoppingBag className="w-5 h-5" />, path: '/admin/buyers' },
    { label: 'Analytics', icon: <BarChart3 className="w-5 h-5" />, path: '/admin/analytics' },
    { label: 'Audit Log', icon: <ScrollText className="w-5 h-5" />, path: '/admin/audit-log' },
]

function getLinks(role: string): SidebarLink[] {
    switch (role) {
        case 'VENDOR': return VENDOR_LINKS
        case 'ADMIN':
        case 'SUPER_ADMIN': return ADMIN_LINKS
        default: return BUYER_LINKS
    }
}

/* ── Sidebar content (shared between desktop and mobile) ── */
function SidebarContent({
    links,
    activePath,
    role,
    userName,
    onNavigate,
    onLogout,
}: {
    links: SidebarLink[]
    activePath: string
    role: string
    userName: string
    onNavigate?: (path: string) => void
    onLogout?: () => void
}) {
    return (
        <>
            {/* Logo + Notification */}
            <div className="h-16 flex items-center justify-between px-6 border-b border-white/10 shrink-0">
                <button onClick={() => onNavigate?.('/')} className="font-[family-name:var(--font-heading)] text-xl font-bold tracking-tight cursor-pointer bg-transparent border-none text-white">
                    <span className="text-gold">N</span>eoa
                </button>
                <div className="flex items-center gap-1">
                    {(role === 'ADMIN' || role === 'SUPER_ADMIN') && (
                        <span className="px-2 py-0.5 bg-gold/20 text-gold text-[10px] font-bold rounded-full uppercase">
                            Admin
                        </span>
                    )}
                    <NotificationCenter onNavigate={onNavigate} role={role} variant="dark" />
                </div>
            </div>

            {/* Nav Links */}
            <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
                {links.map(link => (
                    <button
                        key={link.path + link.label}
                        onClick={() => onNavigate?.(link.path)}
                        className={`
                            w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                            transition-all duration-150 cursor-pointer
                            ${activePath === link.path
                                ? 'bg-gold/15 text-gold'
                                : 'text-white/70 hover:bg-white/5 hover:text-white'
                            }
                        `}
                    >
                        {link.icon}
                        {link.label}
                        {link.badge && (
                            <span className="ml-auto bg-ruby text-white text-xs px-1.5 py-0.5 rounded-full">
                                {link.badge}
                            </span>
                        )}
                        {activePath === link.path && (
                            <ChevronRight className="w-4 h-4 ml-auto opacity-50" />
                        )}
                    </button>
                ))}
            </nav>

            {/* User Footer with Logout */}
            <div className="p-4 border-t border-white/10 shrink-0">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-full bg-gold/20 flex items-center justify-center text-gold font-bold text-sm shrink-0">
                        {userName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{userName}</p>
                        <p className="text-xs text-white/50 capitalize">{role.toLowerCase().replace('_', ' ')}</p>
                    </div>
                </div>
                <button
                    id="sidebar-logout-btn"
                    onClick={onLogout}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium
                        text-white/70 hover:bg-ruby/15 hover:text-ruby transition-all duration-150 cursor-pointer
                        border border-white/10 hover:border-ruby/30"
                >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                </button>
            </div>
        </>
    )
}

export default function AppShell({ children, role = 'BUYER', activePath = '/', userName = 'User', onNavigate, onLogout }: AppShellProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const links = getLinks(role)

    return (
        <div className="min-h-screen bg-platinum-light">
            {/* ══════════════════════════════════════════
                DESKTOP LAYOUT: flex row with spacer
               ══════════════════════════════════════════ */}
            <div className="flex min-h-screen">

                {/* ── Spacer: reserves sidebar width in the flex row ── */}
                <div className="hidden lg:block w-sidebar shrink-0" aria-hidden="true" />

                {/* ── Desktop Sidebar (fixed, visual layer) ── */}
                <aside className="hidden lg:flex flex-col w-sidebar bg-navy text-white fixed inset-y-0 left-0 z-30 border-r border-navy-light">
                    <SidebarContent
                        links={links}
                        activePath={activePath}
                        role={role}
                        userName={userName}
                        onNavigate={onNavigate}
                        onLogout={onLogout}
                    />
                </aside>

                {/* ── Main Content Area ── */}
                <main className="flex-1 min-w-0 overflow-hidden pt-14 lg:pt-0 pb-16 lg:pb-0">
                    <div className="p-4 sm:p-6 lg:p-8">
                        {children}
                    </div>
                </main>
            </div>

            {/* ══════════════════════════════════════════
                MOBILE HEADER (fixed top)
               ══════════════════════════════════════════ */}
            <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-navy text-white flex items-center justify-between px-4 z-40 shadow-md">
                <button onClick={() => onNavigate?.('/')} className="font-[family-name:var(--font-heading)] text-lg font-bold cursor-pointer bg-transparent border-none text-white">
                    <span className="text-gold">N</span>eoa
                </button>
                <div className="flex items-center gap-1">
                    <NotificationCenter onNavigate={onNavigate} role={role} variant="dark" />
                    <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-lg hover:bg-white/10 cursor-pointer">
                        {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                </div>
            </header>

            {/* ══════════════════════════════════════════
                MOBILE SIDEBAR DRAWER
               ══════════════════════════════════════════ */}
            <AnimatePresence>
                {sidebarOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="lg:hidden fixed inset-0 bg-navy/60 backdrop-blur-sm z-40"
                            onClick={() => setSidebarOpen(false)}
                        />
                        <motion.aside
                            initial={{ x: -280 }}
                            animate={{ x: 0 }}
                            exit={{ x: -280 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                            className="lg:hidden fixed inset-y-0 left-0 w-sidebar-mobile bg-navy text-white z-50 shadow-2xl flex flex-col"
                        >
                            {/* Header with close */}
                            <div className="h-14 flex items-center justify-between px-5 border-b border-white/10 shrink-0">
                                <span className="font-[family-name:var(--font-heading)] text-lg font-bold">
                                    <span className="text-gold">N</span>eoa
                                </span>
                                <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-lg hover:bg-white/10 cursor-pointer">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Nav Links */}
                            <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
                                {links.map(link => (
                                    <button
                                        key={link.path + link.label}
                                        onClick={() => { onNavigate?.(link.path); setSidebarOpen(false) }}
                                        className={`
                                            w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                                            transition-all duration-150 cursor-pointer
                                            ${activePath === link.path
                                                ? 'bg-gold/15 text-gold'
                                                : 'text-white/70 hover:bg-white/5 hover:text-white'}
                                        `}
                                    >
                                        {link.icon}
                                        {link.label}
                                    </button>
                                ))}
                            </nav>

                            {/* User Footer + Logout (WAS MISSING!) */}
                            <div className="p-4 border-t border-white/10 shrink-0">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-9 h-9 rounded-full bg-gold/20 flex items-center justify-center text-gold font-bold text-sm shrink-0">
                                        {userName.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{userName}</p>
                                        <p className="text-xs text-white/50 capitalize">{role.toLowerCase().replace('_', ' ')}</p>
                                    </div>
                                </div>
                                <button
                                    id="mobile-logout-btn"
                                    onClick={() => { setSidebarOpen(false); onLogout?.() }}
                                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium
                                        text-white/70 hover:bg-ruby/15 hover:text-ruby transition-all duration-150 cursor-pointer
                                        border border-white/10 hover:border-ruby/30"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Sign Out
                                </button>
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* ══════════════════════════════════════════
                MOBILE BOTTOM NAV ("Thumb Zone")
               ══════════════════════════════════════════ */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-platinum flex items-center justify-around h-14 z-30 shadow-[0_-2px_10px_rgb(0_0_0_/0.05)]">
                {links.slice(0, 3).map(link => (
                    <button
                        key={link.path + link.label}
                        onClick={() => onNavigate?.(link.path)}
                        className={`
                            flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg
                            transition-colors duration-150 cursor-pointer
                            ${activePath === link.path ? 'text-gold' : 'text-platinum-dark'}
                        `}
                    >
                        {link.icon}
                        <span className="text-[10px] font-medium">{link.label}</span>
                    </button>
                ))}
                {/* Logout in bottom nav as a clear, always-visible option */}
                <button
                    id="bottom-nav-logout-btn"
                    onClick={onLogout}
                    className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg
                        transition-colors duration-150 cursor-pointer text-platinum-dark hover:text-ruby"
                >
                    <LogOut className="w-5 h-5" />
                    <span className="text-[10px] font-medium">Sign Out</span>
                </button>
            </nav>
        </div>
    )
}
