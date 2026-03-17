// ═══════════════════════════════════════════════
// BUYER TRUST SCORE ENGINE
// Recalculates and returns buyer trust score
// Called after: order completion, dispute resolution
// ═══════════════════════════════════════════════

import type { SupabaseClient } from '@supabase/supabase-js'

// Trust score tiers
export const TRUST_TIERS = {
  FLAGGED:  { min: 0,  max: 20, label: 'Flagged',  color: 'red' },
  NORMAL:   { min: 21, max: 50, label: 'Normal',   color: 'gray' },
  TRUSTED:  { min: 51, max: 80, label: 'Trusted',  color: 'green' },
  PREMIUM:  { min: 81, max: 100, label: 'Premium', color: 'gold' },
} as const

export type TrustTier = keyof typeof TRUST_TIERS

export function getTrustTier(score: number): TrustTier {
  if (score <= 20) return 'FLAGGED'
  if (score <= 50) return 'NORMAL'
  if (score <= 80) return 'TRUSTED'
  return 'PREMIUM'
}

// Score deltas
const SCORE_DELTAS = {
  ORDER_COMPLETED: 10,      // Successful order, no dispute
  DISPUTE_WON: 5,           // Buyer was right, got refund
  DISPUTE_LOST: -15,        // Buyer was wrong, vendor got paid
  DISPUTE_REJECTED: -25,    // Dispute was rejected by admin (abuse)
  MONTH_AGE_BONUS: 2,       // Per month of account age
  MAX_AGE_BONUS: 48,        // Cap: 24 months × 2 points
} as const

/**
 * Recalculate trust score for a buyer.
 * Uses the database function for atomic calculation, or falls back
 * to in-app calculation if the DB function isn't deployed yet.
 */
export async function recalculateTrustScore(
  supabase: SupabaseClient,
  buyerId: string
): Promise<{ score: number; tier: TrustTier }> {

  // Try the database function first (atomic, consistent)
  const { data: dbScore, error: rpcError } = await supabase
    .rpc('recalculate_trust_score', { buyer_uuid: buyerId })

  if (!rpcError && typeof dbScore === 'number') {
    return { score: dbScore, tier: getTrustTier(dbScore) }
  }

  // Fallback: calculate in-app if DB function not deployed yet
  console.warn('Trust score DB function not available, using in-app calculation')

  const [completedRes, disputesWonRes, disputesLostRes, profileRes] = await Promise.all([
    // Completed orders without disputes
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('buyer_id', buyerId)
      .eq('status', 'COMPLETED')
      .eq('is_disputed', false),

    // Disputes where buyer was right (refunded)
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('buyer_id', buyerId)
      .eq('status', 'REFUNDED')
      .eq('is_disputed', true),

    // Disputes where buyer was wrong (completed despite dispute)
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('buyer_id', buyerId)
      .eq('status', 'COMPLETED')
      .eq('is_disputed', true),

    // Profile for account age
    supabase
      .from('profiles')
      .select('created_at')
      .eq('id', buyerId)
      .single(),
  ])

  const completedOrders = completedRes.count || 0
  const disputesWon = disputesWonRes.count || 0
  const disputesLost = disputesLostRes.count || 0

  // Account age in months (capped)
  let ageMonths = 0
  if (profileRes.data?.created_at) {
    const ageMs = Date.now() - new Date(profileRes.data.created_at).getTime()
    ageMonths = Math.min(24, Math.floor(ageMs / (30 * 24 * 60 * 60 * 1000)))
  }

  // Calculate
  let score = 50
    + (completedOrders * SCORE_DELTAS.ORDER_COMPLETED)
    + (disputesWon * SCORE_DELTAS.DISPUTE_WON)
    + (disputesLost * SCORE_DELTAS.DISPUTE_LOST)
    + Math.min(SCORE_DELTAS.MAX_AGE_BONUS, ageMonths * SCORE_DELTAS.MONTH_AGE_BONUS)

  // Clamp
  score = Math.max(0, Math.min(100, score))

  // Persist
  await supabase
    .from('profiles')
    .update({ trust_score: score })
    .eq('id', buyerId)

  return { score, tier: getTrustTier(score) }
}

/**
 * Check if a buyer is flagged (trust_score ≤ 20).
 * Returns null if the buyer is fine, or a reason string if flagged.
 */
export async function checkBuyerTrustGate(
  supabase: SupabaseClient,
  buyerId: string
): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('trust_score')
    .eq('id', buyerId)
    .single()

  if (!data) return null // New user, no restriction

  const score = data.trust_score ?? 50
  if (score <= 20) {
    return `Your account is under review (trust score: ${score}). Please contact support to continue.`
  }

  return null
}
