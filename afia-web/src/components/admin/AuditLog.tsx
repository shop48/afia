import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
    ScrollText, Shield, Flag, DollarSign, Users,
    AlertTriangle, Clock, ChevronDown,
} from 'lucide-react'
import { apiClient } from '../../lib/api'

// ═══════════════════════════════════════════════
// MODULE 7.4: ACTIVITY FEED / AUDIT LOG
// Immutable admin action trail
// ═══════════════════════════════════════════════

interface AuditEntry {
    id: string
    action: string
    target_type: string
    target_id: string | null
    metadata: Record<string, unknown>
    ip_address: string | null
    created_at: string
    admin: {
        id: string
        full_name: string | null
        email: string
    } | null
}

interface Pagination {
    page: number
    limit: number
    total: number
    total_pages: number
}

// Action → config map for visual styling
const ACTION_CONFIG: Record<string, { icon: typeof Shield; color: string; bg: string; label: string }> = {
    BATCH_PAYOUT_EXECUTED: {
        icon: DollarSign,
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10 border-emerald-500/20',
        label: 'Batch Payout',
    },
    VENDOR_FLAGGED: {
        icon: Flag,
        color: 'text-ruby',
        bg: 'bg-ruby/10 border-ruby/20',
        label: 'Vendor Flagged',
    },
    VENDOR_UNFLAGGED: {
        icon: Flag,
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10 border-emerald-500/20',
        label: 'Vendor Unflagged',
    },
    TREASURY_MODE_CHANGED: {
        icon: Users,
        color: 'text-amber-400',
        bg: 'bg-amber-500/10 border-amber-500/20',
        label: 'Treasury Toggle',
    },
    DISPUTE_RESOLVED: {
        icon: AlertTriangle,
        color: 'text-blue-400',
        bg: 'bg-blue-500/10 border-blue-500/20',
        label: 'Dispute Resolved',
    },
}

const DEFAULT_CONFIG = {
    icon: Shield,
    color: 'text-platinum',
    bg: 'bg-white/5 border-white/10',
    label: 'Admin Action',
}

export default function AuditLog() {
    const [logs, setLogs] = useState<AuditEntry[]>([])
    const [pagination, setPagination] = useState<Pagination | null>(null)
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [expandedId, setExpandedId] = useState<string | null>(null)

    const fetchLogs = useCallback(async (page = 1, append = false) => {
        if (page === 1) setLoading(true)
        else setLoadingMore(true)
        setError(null)

        try {
            const data = await apiClient<{ logs: AuditEntry[]; pagination: Pagination }>(
                `/api/admin/audit-log?page=${page}&limit=30`
            )
            setLogs(prev => append ? [...prev, ...(data.logs || [])] : (data.logs || []))
            setPagination(data.pagination || null)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load audit log')
        } finally {
            setLoading(false)
            setLoadingMore(false)
        }
    }, [])

    useEffect(() => { fetchLogs() }, [fetchLogs])

    const formatTime = (date: string) => {
        const d = new Date(date)
        const now = new Date()
        const diffMs = now.getTime() - d.getTime()
        const diffMins = Math.floor(diffMs / 60000)
        const diffHrs = Math.floor(diffMs / 3600000)
        const diffDays = Math.floor(diffMs / 86400000)

        if (diffMins < 1) return 'Just now'
        if (diffMins < 60) return `${diffMins}m ago`
        if (diffHrs < 24) return `${diffHrs}h ago`
        if (diffDays < 7) return `${diffDays}d ago`
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    }

    const formatFullDate = (date: string) =>
        new Date(date).toLocaleString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
        })

    const getActionDescription = (entry: AuditEntry): string => {
        const meta = entry.metadata || {}
        switch (entry.action) {
            case 'BATCH_PAYOUT_EXECUTED':
                return `Released ${meta.released_count || 0} of ${meta.order_count || 0} orders — Total: $${meta.total_released || 0}`
            case 'VENDOR_FLAGGED':
                return `Flagged vendor ${meta.vendor_name || entry.target_id}${meta.reason ? ` — Reason: ${meta.reason}` : ''}`
            case 'VENDOR_UNFLAGGED':
                return `Unflagged vendor ${meta.vendor_name || entry.target_id}`
            case 'TREASURY_MODE_CHANGED':
                return `Changed ${meta.vendor_name || 'vendor'} treasury: ${meta.old_mode} → ${meta.new_mode}`
            default:
                return `${entry.action} on ${entry.target_type}${entry.target_id ? ` (${entry.target_id.slice(0, 8)}...)` : ''}`
        }
    }

    if (loading) {
        return (
            <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="animate-pulse bg-white/5 rounded-xl h-16 border border-white/10" />
                ))}
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-gold font-[family-name:var(--font-heading)]">
                    Audit Log
                </h2>
                <p className="text-sm text-platinum-dark mt-1">
                    {pagination ? `${pagination.total} total entries` : 'Immutable admin activity trail'}
                </p>
            </div>

            {error && (
                <div className="bg-ruby/10 border border-ruby/30 text-ruby rounded-xl p-4 text-sm">
                    {error}
                    <button onClick={() => fetchLogs()} className="ml-2 underline cursor-pointer">Retry</button>
                </div>
            )}

            {logs.length === 0 ? (
                <div className="text-center py-16">
                    <ScrollText className="w-12 h-12 text-platinum-dark mx-auto mb-4" />
                    <p className="text-platinum-dark">No audit entries yet. Actions will appear here.</p>
                </div>
            ) : (
                <>
                    {/* Timeline */}
                    <div className="relative">
                        {/* Vertical line */}
                        <div className="absolute left-6 top-6 bottom-0 w-px bg-white/10" />

                        <div className="space-y-1">
                            {logs.map((entry, i) => {
                                const config = ACTION_CONFIG[entry.action] || DEFAULT_CONFIG
                                const Icon = config.icon

                                return (
                                    <motion.div
                                        key={entry.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.03 }}
                                        className="relative"
                                    >
                                        <div
                                            className={`ml-12 border rounded-xl p-4 transition-all cursor-pointer
                        hover:bg-white/[0.02] ${config.bg} ${expandedId === entry.id ? 'ring-1 ring-white/20' : ''
                                                }`}
                                            onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                                        >
                                            {/* Timeline dot */}
                                            <div className={`absolute left-4 top-5 w-5 h-5 rounded-full border-2 border-navy-dark
                        flex items-center justify-center ${config.bg.split(' ')[0]}`}>
                                                <Icon className={`w-3 h-3 ${config.color}`} />
                                            </div>

                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className={`text-xs font-bold uppercase tracking-wider ${config.color}`}>
                                                            {config.label}
                                                        </span>
                                                        <span className="text-xs text-platinum-dark flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            {formatTime(entry.created_at)}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-platinum">{getActionDescription(entry)}</p>
                                                    <p className="text-xs text-platinum-dark mt-1">
                                                        by {entry.admin?.full_name || entry.admin?.email || 'System'}
                                                    </p>
                                                </div>
                                                <ChevronDown className={`w-4 h-4 text-platinum-dark flex-shrink-0 transition-transform ${expandedId === entry.id ? 'rotate-180' : ''
                                                    }`} />
                                            </div>

                                            {/* Expanded metadata */}
                                            {expandedId === entry.id && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    className="mt-3 pt-3 border-t border-white/10"
                                                >
                                                    <div className="grid grid-cols-2 gap-3 text-xs">
                                                        <div>
                                                            <p className="text-platinum-dark">Timestamp</p>
                                                            <p className="text-platinum font-mono">{formatFullDate(entry.created_at)}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-platinum-dark">Entry ID</p>
                                                            <p className="text-platinum font-mono">{entry.id.slice(0, 16)}...</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-platinum-dark">Target Type</p>
                                                            <p className="text-platinum">{entry.target_type}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-platinum-dark">Target ID</p>
                                                            <p className="text-platinum font-mono">{entry.target_id || '—'}</p>
                                                        </div>
                                                    </div>
                                                    {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                                                        <div className="mt-3">
                                                            <p className="text-platinum-dark text-xs mb-1">Metadata</p>
                                                            <pre className="text-xs text-platinum bg-navy-dark/50 rounded-lg p-3 overflow-auto max-h-32 font-mono">
                                                                {JSON.stringify(entry.metadata, null, 2)}
                                                            </pre>
                                                        </div>
                                                    )}
                                                </motion.div>
                                            )}
                                        </div>
                                    </motion.div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Load More */}
                    {pagination && pagination.page < pagination.total_pages && (
                        <div className="text-center">
                            <button
                                onClick={() => fetchLogs(pagination.page + 1, true)}
                                disabled={loadingMore}
                                className="px-6 py-3 bg-navy-light border border-white/10 text-platinum rounded-xl
                  hover:bg-white/5 transition-colors text-sm font-medium disabled:opacity-50 cursor-pointer"
                            >
                                {loadingMore ? 'Loading...' : `Load More (${pagination.total - logs.length} remaining)`}
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
