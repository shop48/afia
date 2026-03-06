-- ═══════════════════════════════════════════════
-- MODULE 8: REAL PAYMENT INTEGRATIONS — DATABASE MIGRATION
-- Adds: Wise transfer columns, Paystack refund tracking,
--        SmileID KYC columns, vendor bank account fields
-- Target: Supabase / PostgreSQL 15
-- ═══════════════════════════════════════════════

-- 1. WISE TRANSFER TRACKING ON ESCROW LEDGER
ALTER TABLE public.escrow_ledger
ADD COLUMN IF NOT EXISTS wise_quote_id TEXT;

ALTER TABLE public.escrow_ledger
ADD COLUMN IF NOT EXISTS wise_transfer_id TEXT;

ALTER TABLE public.escrow_ledger
ADD COLUMN IF NOT EXISTS wise_transfer_status TEXT;  -- 'incoming_payment_waiting', 'processing', 'funds_converted', 'outgoing_payment_sent', 'funds_refunded'

ALTER TABLE public.escrow_ledger
ADD COLUMN IF NOT EXISTS payout_executed_at TIMESTAMPTZ;

ALTER TABLE public.escrow_ledger
ADD COLUMN IF NOT EXISTS payout_executed_by UUID;

-- 2. PAYSTACK REFUND TRACKING ON ESCROW LEDGER
ALTER TABLE public.escrow_ledger
ADD COLUMN IF NOT EXISTS paystack_refund_id TEXT;

ALTER TABLE public.escrow_ledger
ADD COLUMN IF NOT EXISTS paystack_refund_status TEXT;  -- 'pending', 'processed', 'failed'

ALTER TABLE public.escrow_ledger
ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;

-- 3. SMILEID KYC TRACKING ON PROFILES
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS smileid_job_id TEXT;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS kyc_submitted_at TIMESTAMPTZ;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS kyc_verified_at TIMESTAMPTZ;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS kyc_rejection_reason TEXT;

-- 4. VENDOR BANK ACCOUNT FIELDS (for Paystack local payouts + Wise)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS bank_account_number TEXT;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS bank_code TEXT;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS bank_name TEXT;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS bank_account_name TEXT;  -- As verified by Paystack "Resolve Account"

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS bvn_hash TEXT;  -- Hashed BVN for privacy (never store plaintext)

-- 5. PAYSTACK TRANSFER TRACKING (for NGN payouts via Paystack Transfer)
ALTER TABLE public.escrow_ledger
ADD COLUMN IF NOT EXISTS paystack_transfer_id TEXT;

ALTER TABLE public.escrow_ledger
ADD COLUMN IF NOT EXISTS paystack_transfer_code TEXT;

ALTER TABLE public.escrow_ledger
ADD COLUMN IF NOT EXISTS paystack_recipient_code TEXT;

-- 6. ADD 'REFUNDED' TO vault_status ENUM IF NOT PRESENT
-- (PostgreSQL doesn't support IF NOT EXISTS for ALTER TYPE,
--  so we use a safe DO block)
DO $$
BEGIN
    -- Check if 'REFUNDED' exists in the enum
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumtypid = 'public.vault_status'::regtype
        AND enumlabel = 'REFUNDED'
    ) THEN
        ALTER TYPE public.vault_status ADD VALUE 'REFUNDED';
    END IF;
EXCEPTION
    WHEN others THEN
        -- Enum value might already exist or type doesn't exist
        RAISE NOTICE 'vault_status REFUNDED enum value already exists or type not found';
END $$;

-- 7. INDEXES FOR PAYMENT TRACKING
CREATE INDEX IF NOT EXISTS idx_escrow_wise_transfer_id
ON public.escrow_ledger(wise_transfer_id) WHERE wise_transfer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_escrow_paystack_refund_id
ON public.escrow_ledger(paystack_refund_id) WHERE paystack_refund_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_smileid_job_id
ON public.profiles(smileid_job_id) WHERE smileid_job_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_kyc_level
ON public.profiles(kyc_level) WHERE kyc_level != 'NONE';

-- 8. UNIQUE CONSTRAINT: Only one escrow entry per order (double-entry prevention)
-- This may already exist from Module 4, but ensure it's there
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_escrow_ledger_order_id_unique'
    ) THEN
        CREATE UNIQUE INDEX idx_escrow_ledger_order_id_unique
        ON public.escrow_ledger(order_id);
    END IF;
EXCEPTION
    WHEN duplicate_table THEN
        RAISE NOTICE 'idx_escrow_ledger_order_id_unique already exists';
END $$;

-- 9. PAYSTACK LOCAL PAYOUT QUEUE VIEW (NGN vendors paid via Paystack Transfer)
CREATE OR REPLACE VIEW public.paystack_payout_queue AS
SELECT
    o.id AS order_id,
    o.vendor_id,
    p.full_name AS vendor_name,
    p.email AS vendor_email,
    p.bank_account_number,
    p.bank_code,
    p.bank_name,
    p.bank_account_name,
    p.settlement_currency,
    p.is_flagged AS vendor_flagged,
    p.treasury_mode,
    e.id AS escrow_id,
    e.gross_amount,
    e.fee_amount,
    e.net_payout,
    e.payout_rail_type,
    e.margin_check_passed,
    e.status AS vault_status,
    o.auto_release_at,
    o.delivered_at,
    o.created_at AS order_created_at,
    o.total_amount,
    o.currency AS order_currency
FROM public.orders o
JOIN public.escrow_ledger e ON o.id = e.order_id
JOIN public.profiles p ON o.vendor_id = p.id
WHERE o.status IN ('COMPLETED', 'DELIVERED')
AND o.auto_release_at <= NOW()
AND o.is_disputed = FALSE
AND e.status = 'LOCKED'
AND e.payout_rail_type = 'PAYSTACK_NGN'
AND p.bank_account_number IS NOT NULL;
