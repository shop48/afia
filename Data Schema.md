-- PROJECT AFIA: DATABASE SCHEMA (v4.0)
-- Purpose: Implementation of the "Digital Vault" and "Dual-Rail Logistics"
-- Target: Supabase / PostgreSQL 15

Apply this v4.0 SQL schema to my project to initialize the Digital Vault and Logistics logic."

-- 1. ENUMS & CUSTOM TYPES
-- These ensure strict data integrity and prevent "magic strings" in code. DO $$ BEGIN CREATE TYPE user_role AS ENUM ('GUEST', 'BUYER', 'VENDOR', 'ADMIN', 'SUPER_ADMIN');
CREATE TYPE kyc_status AS ENUM ('NONE', 'PENDING', 'VERIFIED', 'REJECTED');
CREATE TYPE order_status AS ENUM ('AWAITING_PAYMENT', 'PAID', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'DISPUTED', 'REFUNDED');
CREATE TYPE shipping_rail AS ENUM ('API_AUTOMATED', 'MANUAL_WAYBILL');
CREATE TYPE payout_rail AS ENUM ('PAYSTACK_NGN', 'WISE_GLOBAL');
CREATE TYPE vault_status AS ENUM ('LOCKED', 'RELEASE_PENDING', 'RELEASED', 'FROZEN'); EXCEPTION WHEN duplicate_object THEN null; END $$;
-- 2. TABLES
-- Profiles (Extends Supabase Auth.Users) CREATE TABLE IF NOT EXISTS public.profiles (
id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
full_name TEXT,
role user_role DEFAULT 'BUYER',
kyc_level kyc_status DEFAULT 'NONE',
settlement_currency TEXT DEFAULT 'NGN',
wise_recipient_id TEXT,
created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Products Catalog CREATE TABLE IF NOT EXISTS public.products (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
vendor_id UUID REFERENCES public.profiles(id),
title TEXT NOT NULL,
description TEXT,
base_price DECIMAL(12,2) NOT NULL,
currency TEXT DEFAULT 'USD',
shipping_estimate_json JSONB, -- Stores "Smart Estimator" results for Inclusive Pricing
stock_count INTEGER DEFAULT 0,
is_active BOOLEAN DEFAULT TRUE,
created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Orders (The Escrow Contract) CREATE TABLE IF NOT EXISTS public.orders (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
buyer_id UUID REFERENCES public.profiles(id),
vendor_id UUID REFERENCES public.profiles(id),
product_id UUID REFERENCES public.products(id),
status order_status DEFAULT 'AWAITING_PAYMENT',
-- Dual-Rail Logistics Logic
shipping_type shipping_rail DEFAULT 'MANUAL_WAYBILL',
waybill_url TEXT,         -- For Manual Waybill proof
courier_phone TEXT,       -- For Admin arbitration
tracking_id TEXT,         -- For API Automated tracking

-- The "Contract" Timestamps (Pivot for Auto-Release)
estimated_delivery_date TIMESTAMPTZ, -- Set by Vendor on Shipping
shipped_at TIMESTAMPTZ,
delivered_at TIMESTAMPTZ, -- Confirmed via Buyer Click, API, or EDD+24h logic
auto_release_at TIMESTAMPTZ, -- delivered_at + 48 hours

is_disputed BOOLEAN DEFAULT FALSE,
paystack_ref TEXT UNIQUE,
created_at TIMESTAMPTZ DEFAULT NOW()

);
-- Escrow Ledger (The Double-Entry Vault) CREATE TABLE IF NOT EXISTS public.escrow_ledger (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
order_id UUID REFERENCES public.orders(id),
gross_amount DECIMAL(12,2) NOT NULL,
fee_amount DECIMAL(12,2) NOT NULL, -- Platform 15%
net_payout DECIMAL(12,2) NOT NULL, -- Vendor 85%
status vault_status DEFAULT 'LOCKED',
payout_rail_type payout_rail,
margin_check_passed BOOLEAN DEFAULT FALSE,
created_at TIMESTAMPTZ DEFAULT NOW()
);
-- 3. AUTOMATION: THE 48-HOUR TRIGGER
-- This function automatically sets the 48-hour release timer -- the moment an order is marked as 'DELIVERED'.
CREATE OR REPLACE FUNCTION set_release_timer()
RETURNS TRIGGER AS $$
BEGIN -- Only trigger when transitioning TO 'DELIVERED'
IF (NEW.status = 'DELIVERED' AND OLD.status <> 'DELIVERED') THEN
NEW.delivered_at = NOW();
NEW.auto_release_at = NOW() + INTERVAL '48 hours';
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trigger_release_timer ON public.orders; CREATE TRIGGER trigger_release_timer
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION set_release_timer();
-- 4. SUPER ADMIN VIEWS (THE FRIDAY BATCH)
-- This view generates the "Friday Payout Queue" for the Super Admin. -- It only shows orders that are DELIVERED, past the 48h buffer, and NOT disputed. CREATE OR REPLACE VIEW public.payout_queue_friday AS
SELECT
o.id AS order_id,
p.full_name AS vendor_name,
p.wise_recipient_id,
e.net_payout,
e.payout_rail_type, o.auto_release_at, o.courier_phone, o.waybill_url
FROM public.orders o
JOIN public.escrow_ledger e ON o.id = e.order_id
JOIN public.profiles p ON o.vendor_id = p.id
WHERE o.status = 'DELIVERED'
AND o.auto_release_at <= NOW()
AND o.is_disputed = FALSE
AND e.status = 'LOCKED';
-- 5. SECURITY (RLS POLICIES)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY; ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY; ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
-- Standard RLS: Users only see what belongs to them CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id); CREATE POLICY "Public product view" ON public.products FOR SELECT USING (is_active = true); CREATE POLICY "Users view own orders" ON public.orders FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = vendor_id);

