interface SkeletonProps {
    className?: string
    lines?: number
    circle?: boolean
}

export default function Skeleton({ className = '', lines = 1, circle = false }: SkeletonProps) {
    if (circle) {
        return <div className={`skeleton rounded-full ${className}`} />
    }

    if (lines > 1) {
        return (
            <div className="space-y-2.5">
                {Array.from({ length: lines }).map((_, i) => (
                    <div
                        key={i}
                        className={`skeleton h-4 ${i === lines - 1 ? 'w-3/4' : 'w-full'} ${className}`}
                    />
                ))}
            </div>
        )
    }

    return <div className={`skeleton h-4 w-full ${className}`} />
}

// Pre-built skeleton patterns
Skeleton.Card = function SkeletonCard() {
    return (
        <div className="bg-white rounded-xl border border-platinum p-6 space-y-4">
            <div className="skeleton h-40 w-full rounded-lg" />
            <div className="skeleton h-5 w-3/4" />
            <div className="skeleton h-4 w-1/2" />
            <div className="flex justify-between items-center pt-2">
                <div className="skeleton h-6 w-24" />
                <div className="skeleton h-9 w-20 rounded-lg" />
            </div>
        </div>
    )
}

Skeleton.Row = function SkeletonRow() {
    return (
        <div className="flex items-center gap-4 py-4 border-b border-platinum">
            <div className="skeleton w-10 h-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
                <div className="skeleton h-4 w-1/3" />
                <div className="skeleton h-3 w-1/2" />
            </div>
            <div className="skeleton h-8 w-20 rounded-md" />
        </div>
    )
}
