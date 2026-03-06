import { Component, type ReactNode } from 'react'

interface ErrorBoundaryProps {
    children: ReactNode
    fallback?: ReactNode
}

interface ErrorBoundaryState {
    hasError: boolean
    error: Error | null
}

/**
 * Global React Error Boundary for production crash recovery.
 * Catches unhandled render errors and shows a graceful fallback UI
 * instead of a blank white screen.
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // In production, send to monitoring service (e.g., Sentry)
        console.error('[ErrorBoundary] Uncaught error:', error, errorInfo)
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null })
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback

            return (
                <div className="min-h-screen bg-platinum-light flex items-center justify-center px-6">
                    <div className="text-center max-w-md">
                        <div className="w-16 h-16 rounded-full bg-ruby/10 flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-ruby" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-navy font-[family-name:var(--font-heading)] mb-2">
                            Something went wrong
                        </h2>
                        <p className="text-sm text-platinum-dark mb-6">
                            An unexpected error occurred. Please try again or contact support if this persists.
                        </p>
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={this.handleReset}
                                className="px-5 py-2.5 bg-gold text-navy-dark font-semibold rounded-full cursor-pointer hover:bg-gold-light transition-colors text-sm"
                            >
                                Try Again
                            </button>
                            <button
                                onClick={() => window.location.href = '/catalog'}
                                className="px-5 py-2.5 bg-platinum text-navy font-medium rounded-xl cursor-pointer hover:bg-platinum-dark/20 transition-colors text-sm"
                            >
                                Go Home
                            </button>
                        </div>
                        {import.meta.env.DEV && this.state.error && (
                            <details className="mt-6 text-left">
                                <summary className="text-xs text-platinum-dark cursor-pointer">Dev Error Details</summary>
                                <pre className="mt-2 text-xs text-ruby bg-ruby/5 p-3 rounded-lg overflow-auto max-h-40">
                                    {this.state.error.message}
                                    {'\n'}
                                    {this.state.error.stack}
                                </pre>
                            </details>
                        )}
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}
