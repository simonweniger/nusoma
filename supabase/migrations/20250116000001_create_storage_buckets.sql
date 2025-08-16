-- Create storage buckets for file uploads (if they don't exist)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('avatars', 'avatars', false, 52428800, '{"image/*"}'),
  ('files', 'files', false, 52428800, null),
  ('screenshots', 'screenshots', false, 52428800, '{"image/*"}')
ON CONFLICT (id) DO NOTHING;
