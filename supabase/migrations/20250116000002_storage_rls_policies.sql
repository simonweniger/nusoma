-- RLS is already enabled on storage.objects by default

-- Drop existing policies if they exist, then recreate them
DO $$
BEGIN
    -- Drop policies if they exist
    DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
    DROP POLICY IF EXISTS "Users can view their own avatars" ON storage.objects;
    DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
    DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
    
    DROP POLICY IF EXISTS "Users can upload their own files" ON storage.objects;
    DROP POLICY IF EXISTS "Users can view their own files" ON storage.objects;
    DROP POLICY IF EXISTS "Users can update their own files" ON storage.objects;
    DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;
    
    DROP POLICY IF EXISTS "Users can upload their own screenshots" ON storage.objects;
    DROP POLICY IF EXISTS "Users can view their own screenshots" ON storage.objects;
    DROP POLICY IF EXISTS "Users can update their own screenshots" ON storage.objects;
    DROP POLICY IF EXISTS "Users can delete their own screenshots" ON storage.objects;
END $$;

-- RLS policies for avatars bucket
CREATE POLICY "Users can upload their own avatars" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own avatars" ON storage.objects
FOR SELECT USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatars" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatars" ON storage.objects
FOR DELETE USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS policies for files bucket
CREATE POLICY "Users can upload their own files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'files' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'files' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own files" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'files' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'files' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS policies for screenshots bucket (with upsert support)
CREATE POLICY "Users can upload their own screenshots" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'screenshots' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own screenshots" ON storage.objects
FOR SELECT USING (
  bucket_id = 'screenshots' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own screenshots" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'screenshots' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own screenshots" ON storage.objects
FOR DELETE USING (
  bucket_id = 'screenshots' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);