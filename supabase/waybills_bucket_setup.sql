-- WAYBILLS STORAGE BUCKET SETUP
-- Purpose: Storage for vendor waybill/shipping receipt photos
-- Upload Method: Via backend API endpoint /api/upload/waybill (uses service key)
-- No client-side RLS policies needed — all uploads go through the authenticated API
-- 
-- Bucket was created via Storage API:
-- POST https://<project>.supabase.co/storage/v1/bucket
-- { "id": "waybills", "name": "waybills", "public": true, 
--   "file_size_limit": 5242880, 
--   "allowed_mime_types": ["image/jpeg", "image/png", "image/webp"] }
--
-- If you need to create it via SQL:
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('waybills', 'waybills', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Optional: If you want to add read-only public access policy 
-- (only needed if accessing images directly without the service key)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Public read waybills') THEN
    CREATE POLICY "Public read waybills" ON storage.objects
      FOR SELECT USING (bucket_id = 'waybills');
  END IF;
END $$;
