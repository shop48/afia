-- MODULE 6: DISPUTE RESOLUTION — DATABASE MIGRATION
-- Purpose: Add dispute workflow columns, RLS policies, and storage bucket
-- Target: Supabase / PostgreSQL 15+
-- Status: APPLIED via Supabase MCP

-- 1. Create dispute category enum
DO $$ 
BEGIN 
    CREATE TYPE dispute_category AS ENUM ('NOT_RECEIVED', 'WRONG_ITEM', 'DAMAGED', 'OTHER');
EXCEPTION 
    WHEN duplicate_object THEN null; 
END $$;

-- 2. Add dispute workflow columns to orders table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'dispute_reason'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN dispute_reason TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'dispute_category'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN dispute_category dispute_category;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'disputed_at'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN disputed_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'dispute_evidence_urls'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN dispute_evidence_urls TEXT[];
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'admin_notes'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN admin_notes TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'resolved_at'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN resolved_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'resolved_by'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN resolved_by UUID REFERENCES public.profiles(id);
    END IF;
END $$;

-- 3. Indexes for fast dispute queries
CREATE INDEX IF NOT EXISTS idx_orders_disputed 
    ON public.orders (is_disputed) 
    WHERE is_disputed = TRUE;

CREATE INDEX IF NOT EXISTS idx_orders_status_disputed 
    ON public.orders (status) 
    WHERE status = 'DISPUTED';

-- 4. RLS: Enable on escrow_ledger (was missing)
ALTER TABLE public.escrow_ledger ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
DO $$
BEGIN
  -- Users can view their own escrow entries
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'escrow_ledger' AND policyname = 'Users view own escrow') THEN
    CREATE POLICY "Users view own escrow" ON public.escrow_ledger 
      FOR SELECT USING (
        order_id IN (SELECT id FROM public.orders WHERE buyer_id = auth.uid() OR vendor_id = auth.uid())
      );
  END IF;

  -- Admins can access all orders
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Admins view all orders') THEN
    CREATE POLICY "Admins view all orders" ON public.orders 
      FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN'))
      );
  END IF;

  -- Super Admin can update disputed orders for resolution
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Super Admin resolve disputes') THEN
    CREATE POLICY "Super Admin resolve disputes" ON public.orders 
      FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'SUPER_ADMIN')
        AND is_disputed = TRUE
      );
  END IF;

  -- Admins can access all escrow entries
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'escrow_ledger' AND policyname = 'Admins view all escrow') THEN
    CREATE POLICY "Admins view all escrow" ON public.escrow_ledger 
      FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN'))
      );
  END IF;
END $$;

-- 6. Storage: Evidence bucket for buyer dispute photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('evidence', 'evidence', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies for evidence bucket
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Authenticated users upload evidence') THEN
    CREATE POLICY "Authenticated users upload evidence" ON storage.objects
      FOR INSERT WITH CHECK (bucket_id = 'evidence' AND auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Public read evidence') THEN
    CREATE POLICY "Public read evidence" ON storage.objects
      FOR SELECT USING (bucket_id = 'evidence');
  END IF;
END $$;
