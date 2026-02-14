
import { useState } from 'react'
import PayoutQueue from './PayoutQueue'
import DisputeArbitration from './DisputeArbitration'
import { ShieldAlert, CreditCard } from 'lucide-react'

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState<'PAYOUTS' | 'DISPUTES'>('PAYOUTS')

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Sidebar */}
            <aside className="w-64 bg-gray-900 text-white flex flex-col">
                <div className="p-6 border-b border-gray-800">
                    <h1 className="text-2xl font-bold tracking-tight">Afia Admin</h1>
                    <span className="text-xs text-yellow-500 font-mono">GOD MODE ENABLED</span>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    <button
                        onClick={() => setActiveTab('PAYOUTS')}
                        className={`w-full flex items-center px-4 py-3 rounded-lg text-left transition-colors ${activeTab === 'PAYOUTS' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800'
                            }`}
                    >
                        <CreditCard className="w-5 h-5 mr-3" />
                        Friday Payout Gate
                    </button>

                    <button
                        onClick={() => setActiveTab('DISPUTES')}
                        className={`w-full flex items-center px-4 py-3 rounded-lg text-left transition-colors ${activeTab === 'DISPUTES' ? 'bg-red-600 text-white' : 'text-gray-400 hover:bg-gray-800'
                            }`}
                    >
                        <ShieldAlert className="w-5 h-5 mr-3" />
                        Dispute Arbitration
                    </button>
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                {activeTab === 'PAYOUTS' ? <PayoutQueue /> : <DisputeArbitration />}
            </main>
        </div>
    )
}
