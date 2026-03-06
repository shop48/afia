// ════════════════════════════════════════════
// MODULE 10: KYC VELOCITY CHECK
// Security Manifest §3 — Flag vendors with >$500
// in sales within their first 48 hours
// ════════════════════════════════════════════

import { SupabaseClient } from '@supabase/supabase-js'

const VELOCITY_THRESHOLD_USD = 500
const VELOCITY_WINDOW_HOURS = 48

interface VelocityResult {
    flagged: boolean
    totalSalesUsd: number
    vendorAge: number // hours since first sale
    threshold: number
}

/**
 * Check if a vendor has exceeded the KYC velocity threshold.
 *
 * Flags vendors who have processed more than $500 in total sales
 * within their first 48 hours on the platform. This is a Sybil attack
 * mitigation — new accounts moving large sums quickly are suspicious.
 *
 * @param supabase - Service-role Supabase client (bypasses RLS)
 * @param vendorId - ID of the vendor to check
 * @param currentOrderAmountNgn - The amount of the current order in NGN
 * @param fxRate - Current USD/NGN rate for conversion
 */
export async function checkKycVelocity(
    supabase: SupabaseClient,
    vendorId: string,
    currentOrderAmountNgn: number,
    fxRate: number | null
): Promise<VelocityResult> {
    const defaultResult: VelocityResult = {
        flagged: false,
        totalSalesUsd: 0,
        vendorAge: Infinity,
        threshold: VELOCITY_THRESHOLD_USD,
    }

    try {
        // Get vendor's profile creation date
        const { data: profile } = await supabase
            .from('profiles')
            .select('created_at, first_sale_at')
            .eq('id', vendorId)
            .single()

        if (!profile) return defaultResult

        // Determine when the vendor started selling
        const firstSaleAt = profile.first_sale_at
            ? new Date(profile.first_sale_at)
            : null

        // If this is the vendor's first sale, record first_sale_at
        if (!firstSaleAt) {
            await supabase
                .from('profiles')
                .update({ first_sale_at: new Date().toISOString() })
                .eq('id', vendorId)

            // First sale — check if this single order exceeds threshold
            const orderUsd = fxRate && fxRate > 0
                ? currentOrderAmountNgn / fxRate
                : currentOrderAmountNgn // Assume NGN = USD if no rate (conservative)

            return {
                flagged: orderUsd > VELOCITY_THRESHOLD_USD,
                totalSalesUsd: orderUsd,
                vendorAge: 0,
                threshold: VELOCITY_THRESHOLD_USD,
            }
        }

        // Calculate vendor age in hours since first sale
        const vendorAgeMs = Date.now() - firstSaleAt.getTime()
        const vendorAgeHours = vendorAgeMs / (1000 * 60 * 60)

        // Only check velocity within the first 48 hours
        if (vendorAgeHours > VELOCITY_WINDOW_HOURS) {
            return {
                ...defaultResult,
                vendorAge: vendorAgeHours,
            }
        }

        // Sum all orders for this vendor within the velocity window
        const windowStart = firstSaleAt.toISOString()
        const { data: orders } = await supabase
            .from('orders')
            .select('total_amount, currency')
            .eq('vendor_id', vendorId)
            .gte('created_at', windowStart)
            .in('status', ['PAID', 'SHIPPED', 'DELIVERED', 'COMPLETED'])

        if (!orders || orders.length === 0) return defaultResult

        // Convert all amounts to USD for comparison
        const rate = fxRate && fxRate > 0 ? fxRate : 1580 // Fallback NGN/USD rate
        let totalUsd = 0

        for (const order of orders) {
            const amount = Number(order.total_amount) || 0
            // Assume all amounts are in NGN (Paystack charges in NGN)
            totalUsd += amount / rate
        }

        // Add current order
        totalUsd += currentOrderAmountNgn / rate

        const flagged = totalUsd > VELOCITY_THRESHOLD_USD

        return {
            flagged,
            totalSalesUsd: Math.round(totalUsd * 100) / 100,
            vendorAge: Math.round(vendorAgeHours * 10) / 10,
            threshold: VELOCITY_THRESHOLD_USD,
        }
    } catch (err) {
        console.error('KYC velocity check failed:', err)
        return defaultResult
    }
}

/**
 * Create an admin notification for a KYC velocity alert.
 * This alerts all admins that a vendor has exceeded the threshold.
 */
export async function notifyVelocityAlert(
    supabase: SupabaseClient,
    vendorId: string,
    result: VelocityResult
): Promise<void> {
    try {
        // Get vendor name
        const { data: vendor } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', vendorId)
            .single()

        const vendorName = vendor?.full_name || vendor?.email || vendorId

        // Get all admins
        const { data: admins } = await supabase
            .from('profiles')
            .select('id')
            .in('role', ['ADMIN', 'SUPER_ADMIN'])

        if (!admins || admins.length === 0) {
            console.warn('No admins found for velocity alert notification')
            return
        }

        // Create notification for each admin
        const notifications = admins.map((admin) => ({
            user_id: admin.id,
            type: 'SYSTEM',
            title: `⚠️ KYC Velocity Alert: ${vendorName}`,
            body: `Vendor "${vendorName}" has processed $${result.totalSalesUsd.toFixed(2)} USD within ${result.vendorAge.toFixed(1)}h of their first sale (threshold: $${result.threshold}).`,
            metadata: {
                alert_type: 'KYC_VELOCITY',
                vendor_id: vendorId,
                total_sales_usd: result.totalSalesUsd,
                vendor_age_hours: result.vendorAge,
            },
        }))

        await supabase.from('notifications').insert(notifications)

        console.warn(
            `🚨 KYC VELOCITY ALERT: Vendor ${vendorId} (${vendorName}) — ` +
            `$${result.totalSalesUsd.toFixed(2)} in ${result.vendorAge.toFixed(1)}h`
        )
    } catch (err) {
        console.error('Failed to send velocity alert:', err)
    }
}
