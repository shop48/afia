import { useState } from 'react'
import AdminDashboard from './components/admin/AdminDashboard'
import PaystackCheckout from './components/payments/PaystackCheckout'
import SmileIDVerification from './components/id/SmileIDVerification'
import DesignShowcase from './pages/DesignShowcase'
import { supabase } from './lib/supabase'

type AppView = 'DESIGN' | 'ADMIN' | 'CHECKOUT_DEMO'

export default function App() {
  const [view, setView] = useState<AppView>('DESIGN')
  const [showPaystack, setShowPaystack] = useState(false)
  const [showSmileID, setShowSmileID] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const [kycVerified, setKycVerified] = useState(false)

  const createOrder = async (ref: string) => {
    try {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          buyer_id: '00000000-0000-0000-0000-000000000002',
          vendor_id: '00000000-0000-0000-0000-000000000001',
          product_id: '00000000-0000-0000-0000-000000000001',
          status: 'PAID',
          is_disputed: false,
          paystack_ref: ref,
          shipping_type: 'MANUAL_WAYBILL',
          waybill_url: 'https://example.com/waybill.pdf',
          courier_phone: '+234 800 000 0000',
          shipped_at: new Date().toISOString(),
          delivered_at: new Date(Date.now() - 49 * 60 * 60 * 1000).toISOString(),
          auto_release_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
        })
        .select()
        .single()

      if (orderError) throw orderError

      await supabase
        .from('escrow_ledger')
        .insert({
          order_id: order.id,
          gross_amount: 45000,
          fee_amount: 6750,
          net_payout: 38250,
          status: 'LOCKED',
          payout_rail_type: 'WISE_GLOBAL'
        })

      alert(`Order Created! Ref: ${ref}. Check Admin Dashboard.`)
    } catch (err) {
      console.error('Order creation failed:', err)
      alert('Failed to save order to DB')
    }
  }

  return (
    <div className="min-h-screen relative">
      {/* ══════ VIEW SWITCHER (Development Only) ══════ */}
      <div className="fixed bottom-4 right-4 bg-white/90 backdrop-blur-md p-1.5 rounded-full shadow-lg border border-platinum z-50 flex items-center gap-1">
        {(['DESIGN', 'ADMIN', 'CHECKOUT_DEMO'] as AppView[]).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${view === v
                ? 'bg-navy text-white shadow-md'
                : 'text-navy/60 hover:bg-platinum-light'
              }`}
          >
            {v === 'DESIGN' ? '🎨 Design' : v === 'ADMIN' ? '🛡️ Admin' : '🛒 Checkout'}
          </button>
        ))}
      </div>

      {/* ══════ VIEWS ══════ */}
      {view === 'DESIGN' && <DesignShowcase />}

      {view === 'ADMIN' && <AdminDashboard />}

      {view === 'CHECKOUT_DEMO' && (
        <div className="p-8 max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8 font-[family-name:var(--font-heading)] text-navy">🛒 Checkout Sandbox</h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Product Card */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-platinum">
              <div className="aspect-video bg-platinum-light rounded-lg mb-4 flex items-center justify-center text-5xl">👟</div>
              <h2 className="text-xl font-bold text-navy">Nike Air Max (Custom)</h2>
              <p className="text-platinum-dark mb-4">Size 42 • Ships from Lagos</p>
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold text-navy">₦45,000</span>
                <button
                  disabled={paymentSuccess}
                  onClick={() => setShowPaystack(true)}
                  className="bg-navy text-white px-6 py-3 rounded-lg hover:bg-navy-light disabled:bg-emerald disabled:opacity-100 font-medium transition-colors"
                >
                  {paymentSuccess ? 'Paid ✅' : 'Buy Now'}
                </button>
              </div>
            </div>

            {/* KYC Status */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-platinum">
              <h2 className="text-xl font-bold mb-4 text-navy">Identity Status</h2>
              <div className={`p-4 rounded-lg mb-4 ${kycVerified ? 'bg-emerald/10 text-emerald' : 'bg-gold/10 text-gold-dark'}`}>
                Status: <strong>{kycVerified ? 'VERIFIED' : 'UNVERIFIED'}</strong>
              </div>
              {!kycVerified && (
                <button
                  onClick={() => setShowSmileID(true)}
                  className="w-full border-2 border-gold text-gold-dark font-bold py-3 rounded-lg hover:bg-gold/5 transition-colors"
                >
                  Verify Identity (SmileID)
                </button>
              )}
            </div>
          </div>

          {showPaystack && (
            <PaystackCheckout
              email="buyer@example.com"
              amount={45000}
              onClose={() => setShowPaystack(false)}
              onSuccess={(ref) => {
                setShowPaystack(false)
                setPaymentSuccess(true)
                createOrder(ref)
              }}
            />
          )}

          {showSmileID && (
            <SmileIDVerification
              userId="user_123"
              onSuccess={() => {
                setKycVerified(true)
                setShowSmileID(false)
              }}
            />
          )}
        </div>
      )}
    </div>
  )
}
