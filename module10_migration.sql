-- ══════════════════════════════════════════════════════════════
-- MODULE 10: SECURITY HARDENING MIGRATION
-- Purpose: Add device fingerprinting, KYC velocity tracking,
--          tighten RLS policies, and add security constraints
-- Applied: 2026-03-06
-- ══════════════════════════════════════════════════════════════

-- 1. ADD DEVICE FINGERPRINT & KYC VELOCITY COLUMNS
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS device_fingerprint TEXT,
  ADD COLUMN IF NOT EXISTS first_sale_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_login_ip TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_device_fingerprint
  ON public.profiles (device_fingerprint)
  WHERE device_fingerprint IS NOT NULL;

-- 2. TIGHTEN PROFILES RLS POLICIES
DROP POLICY IF EXISTS "Profiles select policy" ON public.profiles;
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;

CREATE POLICY "Users view own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins view all profiles"
  ON public.profiles FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('ADMIN', 'SUPER_ADMIN')));

CREATE POLICY "Users view vendor profiles"
  ON public.profiles FOR SELECT USING (role = 'VENDOR');

DROP POLICY IF EXISTS "Profiles update policy" ON public.profiles;

CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins update all profiles"
  ON public.profiles FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('ADMIN', 'SUPER_ADMIN')));

-- 3. TIGHTEN ESCROW LEDGER RLS
DROP POLICY IF EXISTS "Users view own escrow" ON public.escrow_ledger;
DROP POLICY IF EXISTS "Users view own escrow entries" ON public.escrow_ledger;

CREATE POLICY "Users view own escrow"
  ON public.escrow_ledger FOR SELECT
  USING (EXISTS (SELECT 1 FROM orders o WHERE o.id = escrow_ledger.order_id AND (o.buyer_id = auth.uid() OR o.vendor_id = auth.uid())));

-- 4. CHECK CONSTRAINTS
DO $$ BEGIN ALTER TABLE public.orders ADD CONSTRAINT chk_orders_total_amount_positive CHECK (total_amount IS NULL OR total_amount > 0); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE public.orders ADD CONSTRAINT chk_orders_quantity_range CHECK (quantity IS NULL OR (quantity >= 1 AND quantity <= 10)); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE public.escrow_ledger ADD CONSTRAINT chk_escrow_gross_positive CHECK (gross_amount > 0); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE public.escrow_ledger ADD CONSTRAINT chk_escrow_fee_non_negative CHECK (fee_amount >= 0); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE public.escrow_ledger ADD CONSTRAINT chk_escrow_net_positive CHECK (net_payout > 0); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 5. SYBIL DETECTION VIEW
CREATE OR REPLACE VIEW public.sybil_detection AS
SELECT p1.id AS user1_id, p1.full_name AS user1_name, p1.role AS user1_role,
       p2.id AS user2_id, p2.full_name AS user2_name, p2.role AS user2_role,
       p1.device_fingerprint, p1.last_login_ip
FROM public.profiles p1
JOIN public.profiles p2 ON p1.device_fingerprint = p2.device_fingerprint AND p1.id < p2.id
WHERE p1.device_fingerprint IS NOT NULL AND p1.device_fingerprint != '';
