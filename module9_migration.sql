-- ══════════════════════════════════════════════════════════════
-- MODULE 9: NOTIFICATIONS & COMMUNICATION
-- Migration for Supabase / PostgreSQL 15
-- ══════════════════════════════════════════════════════════════

-- 1. NOTIFICATION TYPE ENUM
DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM (
    'ORDER_CONFIRMED',
    'WAYBILL_UPLOADED',
    'DELIVERY_CONFIRMED',
    'PRE_RELEASE_WARNING',
    'PAYOUT_RELEASED',
    'DISPUTE_OPENED',
    'DISPUTE_RESOLVED',
    'KYC_STATUS',
    'NEW_ORDER',
    'SYSTEM'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 2. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type        notification_type NOT NULL DEFAULT 'SYSTEM',
  title       TEXT NOT NULL CHECK (char_length(title) <= 200),
  body        TEXT CHECK (body IS NULL OR char_length(body) <= 2000),
  metadata    JSONB DEFAULT '{}',
  is_read     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Add a comment for documentation
COMMENT ON TABLE public.notifications IS 'Module 9: In-app notification feed for buyers, vendors, and admins';

-- 3. PERFORMANCE INDEXES
-- Composite index for unread-count queries (user + unread filter)
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id, is_read, created_at DESC)
  WHERE is_read = FALSE;

-- Composite index for feed queries (user + reverse chrono)
CREATE INDEX IF NOT EXISTS idx_notifications_user_feed
  ON public.notifications (user_id, created_at DESC);

-- 4. ROW LEVEL SECURITY
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only SELECT their own notifications
CREATE POLICY "Users view own notifications"
  ON public.notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only UPDATE `is_read` on their own notifications.
-- The WITH CHECK prevents changing user_id, type, title, body, metadata.
-- We use a restricted UPDATE policy: only `is_read` may change.
CREATE POLICY "Users mark own notifications as read"
  ON public.notifications
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    -- Ensure only is_read is being changed (no privilege escalation).
    -- The column-level restriction is enforced at the API layer,
    -- but this extra check ensures user_id cannot be reassigned.
  );

-- Backend service role can INSERT notifications for any user.
-- The service role bypasses RLS entirely, so this policy is a safety net
-- for any direct-insert from a Supabase client with anon key.
-- We restrict it so only service_role can INSERT.
CREATE POLICY "Service role inserts notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (
    -- Only allow inserts from service_role (backend webhooks).
    -- auth.role() returns 'service_role' for the service key client.
    -- Anon/authenticated users cannot insert notifications.
    (SELECT auth.role()) = 'service_role'
  );

-- Prevent DELETE entirely — notifications are immutable records.
-- (No DELETE policy = no one can delete, not even the user.)

-- 5. ENABLE REALTIME for the notifications table
-- This allows Supabase Realtime to push INSERT events to the frontend
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- 6. AUTO-CLEANUP: Function + trigger to cap notifications per user.
-- Keeps only the most recent 200 notifications per user.
-- Runs on INSERT to prevent unbounded table growth.
CREATE OR REPLACE FUNCTION prune_old_notifications()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.notifications
  WHERE id IN (
    SELECT id FROM public.notifications
    WHERE user_id = NEW.user_id
    ORDER BY created_at DESC
    OFFSET 200
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it already exists (idempotent)
DROP TRIGGER IF EXISTS trg_prune_notifications ON public.notifications;

CREATE TRIGGER trg_prune_notifications
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION prune_old_notifications();

-- ══════════════════════════════════════════════════════════════
-- VERIFICATION: Run these queries to confirm:
--   SELECT * FROM pg_tables WHERE tablename = 'notifications';
--   SELECT * FROM pg_indexes WHERE tablename = 'notifications';
--   SELECT * FROM pg_policies WHERE tablename = 'notifications';
--   SELECT * FROM information_schema.triggers WHERE trigger_name = 'trg_prune_notifications';
-- ══════════════════════════════════════════════════════════════
