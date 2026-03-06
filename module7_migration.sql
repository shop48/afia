-- ═══════════════════════════════════════════════
-- MODULE 7: SUPER ADMIN GOD MODE — DATABASE MIGRATION
-- Adds: audit_log table, vendor management columns on profiles
-- Target: Supabase / PostgreSQL 15
-- ═══════════════════════════════════════════════

-- 1. VENDOR MANAGEMENT COLUMNS ON PROFILES
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT FALSE;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS flag_reason TEXT;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS flagged_at TIMESTAMPTZ;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS flagged_by UUID;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS treasury_mode TEXT DEFAULT 'AUTO'
CHECK (treasury_mode IN ('AUTO', 'MANUAL_HOLD'));

-- 2. AUDIT LOG TABLE (Immutable, append-only)
CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES public.profiles(id) NOT NULL,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,    -- 'order', 'vendor', 'payout', 'dispute'
    target_id TEXT,               -- UUID or identifier of the target
    metadata JSONB DEFAULT '{}',  -- Additional context (amounts, reason, etc.)
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_admin_id ON public.audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON public.audit_log(action);

-- RLS on audit_log: only admins can read, inserts via service-role only
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Admins can read audit logs
CREATE POLICY "Admins read audit logs" ON public.audit_log
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('ADMIN', 'SUPER_ADMIN')
    )
);

-- No INSERT/UPDATE/DELETE via client — service-role only
-- (No permissive policies for INSERT/UPDATE/DELETE means RLS blocks them)

-- 3. ENHANCED PAYOUT QUEUE VIEW (replace existing with more data)
CREATE OR REPLACE VIEW public.payout_queue_friday AS
SELECT
    o.id AS order_id,
    o.vendor_id,
    p.full_name AS vendor_name,
    p.email AS vendor_email,
    p.wise_recipient_id,
    p.settlement_currency,
    p.is_flagged AS vendor_flagged,
    p.treasury_mode,
    p.kyc_level,
    e.id AS escrow_id,
    e.gross_amount,
    e.fee_amount,
    e.net_payout,
    e.payout_rail_type,
    e.margin_check_passed,
    e.status AS vault_status,
    o.auto_release_at,
    o.courier_phone,
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
AND e.status = 'LOCKED';

-- 4. Add missing columns to orders if not present (for dispute resolution context)
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS dispute_reason TEXT;

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS dispute_category TEXT;

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS dispute_evidence_urls TEXT[];

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS admin_notes TEXT;

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS disputed_at TIMESTAMPTZ;

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS resolved_by UUID;

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS total_amount DECIMAL(12,2);

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;

-- Add images column to products if missing
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS images TEXT[];

-- 5. ENSURE updated_at COLUMN + TRIGGER ON escrow_ledger (for weekly release tracking)
ALTER TABLE public.escrow_ledger
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_escrow_ledger_updated_at'
    ) THEN
        CREATE TRIGGER trg_escrow_ledger_updated_at
            BEFORE UPDATE ON public.escrow_ledger
            FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
    END IF;
END $$;

-- 6. PERFORMANCE INDEXES for batch vendor query
CREATE INDEX IF NOT EXISTS idx_orders_vendor_id ON public.orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_escrow_ledger_status ON public.escrow_ledger(status);
CREATE INDEX IF NOT EXISTS idx_escrow_ledger_order_id ON public.escrow_ledger(order_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_audit_log_target ON public.audit_log(target_type, action);
