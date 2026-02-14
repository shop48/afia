
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { CheckCircle, AlertTriangle, Eye } from 'lucide-react'

// Types based on the DB View
interface PayoutItem {
    order_id: string
    vendor_name: string
    wise_recipient_id: string
    net_payout: number
    payout_rail_type: string
    auto_release_at: string
    courier_phone: string
    waybill_url: string
}

export default function PayoutQueue() {
    const [queue, setQueue] = useState<PayoutItem[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchQueue()
    }, [])

    const fetchQueue = async () => {
        try {
            // Fetch from the Secure View
            const { data, error } = await supabase
                .from('payout_queue_friday')
                .select('*')

            if (error) throw error
            setQueue(data || [])
        } catch (error) {
            console.error('Error fetching payout queue:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleApprove = async (orderId: string) => {
        // In real "God Mode", this would call a Secure Edge Function
        // For now, we simulate the approval
        alert(`Approving payout for Order ${orderId}`)
    }

    if (loading) return <div className="p-8 text-center">Loading Payout Queue...</div>

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <h1 className="text-3xl font-bold mb-6 text-gray-900 border-b pb-4">
                Friday Payout Gate 🛡️
            </h1>

            {queue.length === 0 ? (
                <div className="text-center p-12 bg-white rounded-lg shadow">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-xl font-medium text-gray-900">All Clear</h3>
                    <p className="text-gray-500">No pending payouts required attention.</p>
                </div>
            ) : (
                <div className="grid gap-6">
                    {queue.map((item) => (
                        <div key={item.order_id} className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">{item.vendor_name}</h3>
                                <p className="text-sm text-gray-500">Wise ID: {item.wise_recipient_id}</p>
                                <div className="mt-2 flex items-center space-x-4 text-sm">
                                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                        {item.payout_rail_type}
                                    </span>
                                    <span className="text-gray-600">
                                        Auto-Release: {new Date(item.auto_release_at).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>

                            <div className="text-right">
                                <div className="text-2xl font-bold text-green-600 mb-2">
                                    KES {item.net_payout.toLocaleString()}
                                </div>
                                <div className="flex space-x-3">
                                    <button
                                        className="flex items-center px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                                        onClick={() => window.open(item.waybill_url, '_blank')}
                                    >
                                        <Eye className="w-4 h-4 mr-2" />
                                        View Waybill
                                    </button>
                                    <button
                                        onClick={() => handleApprove(item.order_id)}
                                        className="flex items-center px-4 py-2 bg-black text-white rounded hover:bg-gray-800 shadow-lg transform active:scale-95 transition-all"
                                    >
                                        <CheckCircle className="w-4 h-4 mr-2" />
                                        Approve Payout
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
