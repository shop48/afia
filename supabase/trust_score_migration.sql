-- ═══════════════════════════════════════════════
-- BUYER TRUST SCORE & INTERNATIONAL KYC — DATABASE MIGRATION
-- Adds: trust_score column, kyc_method tracking
-- Target: Supabase / PostgreSQL 15
-- ═══════════════════════════════════════════════

-- 1. BUYER TRUST SCORE
-- Tracks buyer reliability based on order completion and dispute outcomes
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS trust_score INTEGER DEFAULT 50;

-- Constrain to 0-100 range
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'profiles' AND constraint_name = 'profiles_trust_score_range'
  ) THEN
    ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_trust_score_range CHECK (trust_score >= 0 AND trust_score <= 100);
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE 'Constraint profiles_trust_score_range already exists';
END $$;

-- 2. KYC METHOD TRACKING (enhanced_kyc vs document_verification)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS kyc_method TEXT;  -- 'enhanced_kyc', 'biometric_kyc', 'document_verification'

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS kyc_country TEXT;  -- ISO 3166-1 alpha-2 country code used for KYC

-- 3. INDEX for quick trust score lookups (admin queries, checkout gates)
CREATE INDEX IF NOT EXISTS idx_profiles_trust_score ON public.profiles(trust_score);

-- 4. FUNCTION: Recalculate trust score for a buyer
-- Called after: order completion, dispute resolution
CREATE OR REPLACE FUNCTION recalculate_trust_score(buyer_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  new_score INTEGER := 50;  -- Base score
  completed_orders INTEGER := 0;
  disputes_won INTEGER := 0;
  disputes_lost INTEGER := 0;
  account_age_months INTEGER := 0;
BEGIN
  -- Count completed orders (no disputes)
  SELECT COUNT(*) INTO completed_orders
  FROM public.orders
  WHERE buyer_id = buyer_uuid
    AND status = 'COMPLETED'
    AND is_disputed = FALSE;

  -- Count disputes where buyer was right (refunded)
  SELECT COUNT(*) INTO disputes_won
  FROM public.orders
  WHERE buyer_id = buyer_uuid
    AND status = 'REFUNDED'
    AND is_disputed = TRUE;

  -- Count disputes where buyer was wrong (completed despite dispute)
  SELECT COUNT(*) INTO disputes_lost
  FROM public.orders
  WHERE buyer_id = buyer_uuid
    AND status = 'COMPLETED'
    AND is_disputed = TRUE;

  -- Account age in months (capped at 24 months bonus)
  SELECT LEAST(24, EXTRACT(EPOCH FROM (NOW() - created_at)) / 2592000)::INTEGER
  INTO account_age_months
  FROM public.profiles
  WHERE id = buyer_uuid;

  -- Calculate score
  new_score := 50
    + (completed_orders * 10)    -- +10 per successful order
    + (disputes_won * 5)         -- +5 per dispute won
    - (disputes_lost * 15)       -- -15 per dispute lost
    + (account_age_months * 2);  -- +2 per month of account age (max +48)

  -- Clamp to 0-100
  new_score := GREATEST(0, LEAST(100, new_score));

  -- Update the profile
  UPDATE public.profiles
  SET trust_score = new_score
  WHERE id = buyer_uuid;

  RETURN new_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
