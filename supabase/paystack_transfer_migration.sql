-- ═══════════════════════════════════════════════
-- PAYSTACK TRANSFER & MANUAL PAYOUT — DATABASE MIGRATION
-- Adds: RELEASE_PENDING vault status, transfer tracking columns
-- Target: Supabase / PostgreSQL 15
-- ═══════════════════════════════════════════════

-- 1. ADD 'RELEASE_PENDING' TO vault_status ENUM
-- This status means the transfer has been initiated but we're waiting
-- for Paystack's transfer.success webhook to confirm the vendor got paid.
DO $$
BEGIN
  ALTER TYPE vault_status ADD VALUE IF NOT EXISTS 'RELEASE_PENDING' AFTER 'LOCKED';
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE 'vault_status already has RELEASE_PENDING';
END $$;

-- Also add 'REFUNDED' if not already present (used by dispute resolution)
DO $$
BEGIN
  ALTER TYPE vault_status ADD VALUE IF NOT EXISTS 'REFUNDED' AFTER 'FROZEN';
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE 'vault_status already has REFUNDED';
END $$;

-- 2. PAYSTACK TRANSFER TRACKING COLUMNS ON escrow_ledger
-- These track the full lifecycle of a Paystack NGN transfer

-- Transfer code returned by Paystack (e.g., TRF_xxxxxx)
ALTER TABLE public.escrow_ledger
ADD COLUMN IF NOT EXISTS paystack_transfer_code TEXT;

-- Transfer reference (our idempotency key, e.g., NEOA-PAYOUT-xxxx-xxxx)
ALTER TABLE public.escrow_ledger
ADD COLUMN IF NOT EXISTS paystack_transfer_reference TEXT;

-- Transfer status from Paystack webhook (pending, success, failed, reversed)
ALTER TABLE public.escrow_ledger
ADD COLUMN IF NOT EXISTS paystack_transfer_status TEXT;

-- Paystack recipient code for the vendor (e.g., RCP_xxxxxx)
ALTER TABLE public.escrow_ledger
ADD COLUMN IF NOT EXISTS paystack_recipient_code TEXT;

-- Paystack transfer ID (numeric ID from Paystack)
ALTER TABLE public.escrow_ledger
ADD COLUMN IF NOT EXISTS paystack_transfer_id TEXT;

-- Timestamps for payout lifecycle
ALTER TABLE public.escrow_ledger
ADD COLUMN IF NOT EXISTS payout_executed_at TIMESTAMPTZ;

ALTER TABLE public.escrow_ledger
ADD COLUMN IF NOT EXISTS payout_executed_by UUID;

ALTER TABLE public.escrow_ledger
ADD COLUMN IF NOT EXISTS payout_completed_at TIMESTAMPTZ;

-- Profit floor tracking
ALTER TABLE public.escrow_ledger
ADD COLUMN IF NOT EXISTS profit_floor_check BOOLEAN;

ALTER TABLE public.escrow_ledger
ADD COLUMN IF NOT EXISTS net_profit_percent DECIMAL(6,4);

-- Wise transfer tracking (for manual international payouts)
ALTER TABLE public.escrow_ledger
ADD COLUMN IF NOT EXISTS wise_transfer_id TEXT;

ALTER TABLE public.escrow_ledger
ADD COLUMN IF NOT EXISTS wise_transfer_status TEXT;

-- Refund tracking
ALTER TABLE public.escrow_ledger
ADD COLUMN IF NOT EXISTS paystack_refund_id TEXT;

ALTER TABLE public.escrow_ledger
ADD COLUMN IF NOT EXISTS paystack_refund_status TEXT;

ALTER TABLE public.escrow_ledger
ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;

-- 3. INDEXES FOR WEBHOOK LOOKUPS
-- The transfer webhook needs to quickly find escrow entries by transfer code
CREATE INDEX IF NOT EXISTS idx_escrow_transfer_code
ON public.escrow_ledger(paystack_transfer_code)
WHERE paystack_transfer_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_escrow_transfer_reference
ON public.escrow_ledger(paystack_transfer_reference)
WHERE paystack_transfer_reference IS NOT NULL;

-- Index for payout queue queries (LOCKED + RELEASE_PENDING statuses)
CREATE INDEX IF NOT EXISTS idx_escrow_status
ON public.escrow_ledger(status);

-- 4. UPDATE PAYOUT QUEUE VIEW
-- Include RELEASE_PENDING orders so admin can see pending transfers
CREATE OR REPLACE VIEW public.payout_queue_friday AS
SELECT
  o.id AS order_id,
  o.buyer_id,
  o.vendor_id,
  p.full_name AS vendor_name,
  p.email AS vendor_email,
  p.settlement_currency,
  p.wise_recipient_id,
  p.kyc_level,
  p.bank_account_number AS vendor_bank_account,
  p.bank_code AS vendor_bank_code,
  p.bank_name AS vendor_bank_name,
  p.bank_account_name AS vendor_account_holder,
  p.paystack_recipient_code AS vendor_paystack_recipient,
  p.is_flagged AS vendor_flagged,
  p.treasury_mode,
  e.id AS escrow_id,
  e.gross_amount,
  e.fee_amount,
  e.net_payout,
  e.payout_rail_type,
  e.margin_check_passed,
  e.status AS vault_status,
  e.paystack_transfer_code,
  e.paystack_transfer_status,
  e.profit_floor_check,
  e.net_profit_percent,
  o.auto_release_at,
  o.waybill_url,
  o.shipping_type,
  o.tracking_id,
  o.delivered_at,
  o.created_at AS order_created_at,
  o.total_amount,
  o.currency AS order_currency,
  o.quantity
FROM public.orders o
JOIN public.escrow_ledger e ON o.id = e.order_id
JOIN public.profiles p ON o.vendor_id = p.id
WHERE o.status = 'DELIVERED'
  AND o.auto_release_at <= NOW()
  AND o.is_disputed = FALSE
  AND e.status IN ('LOCKED', 'RELEASE_PENDING');

-- 5. VENDOR PAYSTACK RECIPIENT CODE CACHING
-- Cache the recipient code on the vendor profile to avoid recreating every Friday
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS paystack_recipient_code TEXT;
