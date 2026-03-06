import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    LayoutDashboard, ShoppingBag, Package, Shield,
    Menu, X, LogOut, ChevronRight,
    AlertTriangle, Users, BarChart3, ScrollText,
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
    { label: 'My Orders', icon: <ShoppingBag className="w-5 h-5" />, path: '/dashboard' },
    { label: 'Browse', icon: <Package className="w-5 h-5" />, path: '/catalog' },
]

const VENDOR_LINKS: SidebarLink[] = [
    { label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, path: '/vendor' },
    { label: 'Products', icon: <Package className="w-5 h-5" />, path: '/vendor/products' },
    { label: 'Orders', icon: <ShoppingBag className="w-5 h-5" />, path: '/vendor/orders' },
]

const ADMIN_LINKS: SidebarLink[] = [
    { label: 'Payout Gate', icon: <Shield className="w-5 h-5" />, path: '/admin' },
    { label: 'Disputes', icon: <AlertTriangle className="w-5 h-5" />, path: '/admin/disputes' },
    { label: 'Vendors', icon: <Users className="w-5 h-5" />, path: '/admin/vendors' },
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
                <span className="font-[family-name:var(--font-heading)] text-xl font-bold tracking-tight">
                    <span className="text-gold">N</span>eoa
                </span>
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
                        key={link.path}
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

            {/* User Footer */}
            <div className="p-4 border-t border-white/10 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gold/20 flex items-center justify-center text-gold font-bold text-sm shrink-0">
                        {userName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{userName}</p>
                        <p className="text-xs text-white/50 capitalize">{role.toLowerCase().replace('_', ' ')}</p>
                    </div>
                    <button
                        onClick={onLogout}
                        className="p-1.5 rounded-lg text-white/40 hover:text-ruby hover:bg-white/5 transition-colors cursor-pointer shrink-0"
                        title="Logout"
                    >
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>
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
                {/* This is the KEY architectural element: it physically
                    occupies 260px in the document flow, so the content
                    area can never slide under the sidebar. */}
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
                {/* flex-1: fills remaining width after the spacer
                    min-w-0: prevents flex child from overflowing
                    overflow-hidden: clips any runaway children */}
                <main className="flex-1 min-w-0 overflow-hidden pt-14 lg:pt-0 pb-16 lg:pb-0">
                    <div style={{ padding: 'clamp(1rem, 3vw, 2.5rem)' }}>
                        {children}
                    </div>
                </main>
            </div>

            {/* ══════════════════════════════════════════
                MOBILE HEADER (fixed top)
               ══════════════════════════════════════════ */}
            <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-navy text-white flex items-center justify-between px-4 z-40 shadow-md">
                <span className="font-[family-name:var(--font-heading)] text-lg font-bold">
                    <span className="text-gold">N</span>eoa
                </span>
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
                            <div className="h-14 flex items-center justify-between px-5 border-b border-white/10 shrink-0">
                                <span className="font-[family-name:var(--font-heading)] text-lg font-bold">
                                    <span className="text-gold">N</span>eoa
                                </span>
                                <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-lg hover:bg-white/10 cursor-pointer">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
                                {links.map(link => (
                                    <button
                                        key={link.path}
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
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* ══════════════════════════════════════════
                MOBILE BOTTOM NAV ("Thumb Zone")
               ══════════════════════════════════════════ */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-platinum flex items-center justify-around h-14 z-30 shadow-[0_-2px_10px_rgb(0_0_0_/0.05)]">
                {links.slice(0, 4).map(link => (
                    <button
                        key={link.path}
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
            </nav>
        </div>
    )
}
