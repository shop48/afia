
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { AlertOctagon, CheckCircle, XCircle, Phone, FileText } from 'lucide-react'

// Types
interface DisputedOrder {
    id: string
    status: string
    is_disputed: boolean
    courier_phone: string
    waybill_url: string
    tracking_id: string
    shipping_type: 'API_AUTOMATED' | 'MANUAL_WAYBILL'
    buyer_id: string
    vendor_id: string
    created_at: string
}

export default function DisputeArbitration() {
    const [disputes, setDisputes] = useState<DisputedOrder[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchDisputes()
    }, [])

    const fetchDisputes = async () => {
        try {
            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .eq('is_disputed', true)
                .order('created_at', { ascending: false })

            if (error) throw error
            setDisputes(data || [])
        } catch (error) {
            console.error('Error fetching disputes:', error)
        } finally {
            setLoading(false)
        }
    }

    const resolveDispute = async (orderId: string, outcome: 'REFUNDED' | 'COMPLETED') => {
        if (!confirm(`Are you sure you want to force this order to ${outcome}? This moves funds immediately.`)) return

        try {
            // 1. Update Order Status
            const { error } = await supabase
                .from('orders')
                .update({
                    status: outcome,
                    is_disputed: false,
                    auto_release_at: new Date().toISOString() // Immediate release/refund
                })
                .eq('id', orderId)

            if (error) throw error

            // 2. Refresh List
            setDisputes(disputes.filter(d => d.id !== orderId))
            alert(`Order ${orderId} resolved as ${outcome}`)

        } catch (error) {
            console.error('Resolution failed:', error)
            alert('Failed to resolve dispute')
        }
    }

    if (loading) return <div className="p-8 text-center">Loading Disputes...</div>

    return (
        <div className="p-6 bg-red-50 min-h-screen">
            <h1 className="text-3xl font-bold mb-6 text-red-900 border-b border-red-200 pb-4 flex items-center">
                <AlertOctagon className="mr-3" /> Dispute Arbitration
            </h1>

            {disputes.length === 0 ? (
                <div className="text-center p-12 bg-white rounded-lg shadow">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-xl font-medium text-gray-900">No Active Disputes</h3>
                    <p className="text-gray-500">The platform is running smoothly.</p>
                </div>
            ) : (
                <div className="grid gap-6">
                    {disputes.map((order) => (
                        <div key={order.id} className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-600">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Order #{order.id.slice(0, 8)}</h3>
                                    <div className="mt-2 flex items-center space-x-4 text-sm">
                                        <span className="bg-gray-100 px-2 py-1 rounded font-mono">
                                            {order.shipping_type}
                                        </span>
                                        {order.tracking_id && (
                                            <span className="text-blue-600">Track: {order.tracking_id}</span>
                                        )}
                                    </div>
                                    <div className="mt-4 grid grid-cols-2 gap-4">
                                        <div className="flex items-center text-gray-700">
                                            <Phone className="w-4 h-4 mr-2" />
                                            {order.courier_phone || 'No Courier Phone'}
                                        </div>
                                        <div className="flex items-center text-blue-600 cursor-pointer" onClick={() => window.open(order.waybill_url, '_blank')}>
                                            <FileText className="w-4 h-4 mr-2" />
                                            {order.waybill_url ? 'View Proof' : 'No Waybill'}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col space-y-2">
                                    <button
                                        onClick={() => resolveDispute(order.id, 'COMPLETED')}
                                        className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 shadow"
                                    >
                                        <CheckCircle className="w-4 h-4 mr-2" />
                                        Force Complete (Pay Vendor)
                                    </button>
                                    <button
                                        onClick={() => resolveDispute(order.id, 'REFUNDED')}
                                        className="flex items-center px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 shadow"
                                    >
                                        <XCircle className="w-4 h-4 mr-2" />
                                        Force Refund (Return to Buyer)
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
