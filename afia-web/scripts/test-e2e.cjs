
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://cviwaycytjghpjzndode.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2aXdheWN5dGpnaHBqem5kb2RlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwNjIxNDQsImV4cCI6MjA4NjYzODE0NH0.iZjhyoryWHi4SiIhgeCtcDeeZP98-wG5sKwVBszmBrw';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runTest() {
    console.log('🧪 STARTING E2E SANDBOX TEST...');

    try {
        // 1. SIMULATE BUYER: Create Order
        console.log('\n[1/4] simulating Buyer Checkout...');
        const orderRef = `TEST-${Date.now()}`;
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert({
                buyer_id: '00000000-0000-0000-0000-000000000002', // Test Buyer
                vendor_id: '00000000-0000-0000-0000-000000000001', // Test Vendor
                product_id: '00000000-0000-0000-0000-000000000001', // Nike Air Max
                status: 'DELIVERED', // Simulate immediate delivery for payout test
                is_disputed: false,
                paystack_ref: orderRef,
                shipping_type: 'MANUAL_WAYBILL',
                shipped_at: new Date().toISOString(),
                delivered_at: new Date(Date.now() - 49 * 60 * 60 * 1000).toISOString(), // 49 hours ago
                auto_release_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
            })
            .select()
            .single();

        if (orderError) throw orderError;
        console.log(`✅ Order Created! ID: ${order.id}`);

        // 2. SIMULATE LEDGER creation (usually done by backend, but simulating here)
        const { error: ledgerError } = await supabase
            .from('escrow_ledger')
            .insert({
                order_id: order.id,
                gross_amount: 45000,
                fee_amount: 6750,
                net_payout: 38250,
                status: 'LOCKED',
                payout_rail_type: 'WISE_GLOBAL'
            });

        if (ledgerError) throw ledgerError;
        console.log('✅ Ledger Entry Created (LOCKED)');

        // 3. SIMULATE ADMIN: Verify "Friday Payout Gate" Visibility
        console.log('\n[2/4] Verifying Admin Visibility (Friday Gate)...');
        const { data: adminView, error: viewError } = await supabase
            .from('payout_queue_friday')
            .select('*')
            .eq('order_id', order.id);

        if (viewError) throw viewError;

        if (adminView.length > 0) {
            console.log('✅ Order IS visible in Friday Payout Queue.');
        } else {
            console.error('❌ Order NOT found in Payout Queue! (Dispute timer logic check required)');
        }

        // 4. SIMULATE ADMIN APPROVAL
        console.log('\n[3/4] Simulating Admin Approval...');
        const { data: updatedLedger, error: updateError } = await supabase
            .from('escrow_ledger')
            .update({ status: 'RELEASED' })
            .eq('order_id', order.id)
            .select()
            .single();

        if (updateError) throw updateError;
        console.log(`✅ Payment Approved! Status: ${updatedLedger.status}`);

        console.log('\n🎉 TEST COMPLETED SUCCESSFULLY.');

    } catch (err) {
        console.error('❌ TEST FAILED:', err);
        process.exit(1);
    }
}

runTest();
