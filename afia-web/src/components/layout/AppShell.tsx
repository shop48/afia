import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    LayoutDashboard, ShoppingBag, Package, Shield,
    Bell, Settings, Menu, X, LogOut, ChevronRight
} from 'lucide-react'

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
]

const ADMIN_LINKS: SidebarLink[] = [
    { label: 'Payout Gate', icon: <Shield className="w-5 h-5" />, path: '/admin' },
    { label: 'Disputes', icon: <ShoppingBag className="w-5 h-5" />, path: '/admin/disputes' },
    { label: 'Vendors', icon: <Package className="w-5 h-5" />, path: '/admin/vendors' },
    { label: 'Settings', icon: <Settings className="w-5 h-5" />, path: '/admin/settings' },
]

function getLinks(role: string): SidebarLink[] {
    switch (role) {
        case 'VENDOR': return VENDOR_LINKS
        case 'ADMIN':
        case 'SUPER_ADMIN': return ADMIN_LINKS
        default: return BUYER_LINKS
    }
}

export default function AppShell({ children, role = 'BUYER', activePath = '/', userName = 'User', onNavigate, onLogout }: AppShellProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const links = getLinks(role)

    return (
        <div className="min-h-screen bg-[#FAFAFA] flex">
            {/* ══════ DESKTOP SIDEBAR ══════ */}
            <aside className="hidden lg:flex flex-col w-64 bg-navy text-white border-r border-navy-light fixed h-full z-30">
                {/* Logo */}
                <div className="h-16 flex items-center px-6 border-b border-white/10">
                    <span className="font-[family-name:var(--font-heading)] text-xl font-bold tracking-tight">
                        <span className="text-gold">A</span>fia
                    </span>
                    {(role === 'ADMIN' || role === 'SUPER_ADMIN') && (
                        <span className="ml-2 px-2 py-0.5 bg-gold/20 text-gold text-[10px] font-bold rounded-full uppercase">
                            Admin
                        </span>
                    )}
                </div>

                {/* Nav Links */}
                <nav className="flex-1 py-4 px-3 space-y-1">
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
                <div className="p-4 border-t border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gold/20 flex items-center justify-center text-gold font-bold text-sm">
                            {userName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{userName}</p>
                            <p className="text-xs text-white/50 capitalize">{role.toLowerCase().replace('_', ' ')}</p>
                        </div>
                        <button
                            onClick={onLogout}
                            className="p-1.5 rounded-lg text-white/40 hover:text-ruby hover:bg-white/5 transition-colors"
                            title="Logout"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </aside>

            {/* ══════ MOBILE HEADER ══════ */}
            <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-navy text-white flex items-center justify-between px-4 z-40 shadow-md">
                <span className="font-[family-name:var(--font-heading)] text-lg font-bold">
                    <span className="text-gold">A</span>fia
                </span>
                <div className="flex items-center gap-2">
                    <button className="p-2 rounded-lg hover:bg-white/10 relative">
                        <Bell className="w-5 h-5" />
                    </button>
                    <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-lg hover:bg-white/10">
                        {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                </div>
            </header>

            {/* ══════ MOBILE SIDEBAR DRAWER ══════ */}
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
                            className="lg:hidden fixed top-0 left-0 w-[280px] h-full bg-navy text-white z-50 shadow-2xl"
                        >
                            <div className="h-14 flex items-center justify-between px-5 border-b border-white/10">
                                <span className="font-[family-name:var(--font-heading)] text-lg font-bold">
                                    <span className="text-gold">A</span>fia
                                </span>
                                <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-lg hover:bg-white/10">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <nav className="py-4 px-3 space-y-1">
                                {links.map(link => (
                                    <button
                                        key={link.path}
                                        onClick={() => { onNavigate?.(link.path); setSidebarOpen(false) }}
                                        className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                      transition-all duration-150
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

            {/* ══════ MAIN CONTENT AREA ══════ */}
            <main className="flex-1 lg:ml-64 pt-14 lg:pt-0 min-h-screen">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
                    {children}
                </div>
            </main>

            {/* ══════ MOBILE BOTTOM NAV ("Thumb Zone") ══════ */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-platinum flex items-center justify-around h-14 z-30 shadow-[0_-2px_10px_rgb(0_0_0_/0.05)]">
                {links.slice(0, 4).map(link => (
                    <button
                        key={link.path}
                        onClick={() => onNavigate?.(link.path)}
                        className={`
              flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg
              transition-colors duration-150
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
