-- SQL Script: Create app_versions table for OTA (Over-The-Air) Updates

CREATE TABLE IF NOT EXISTS public.app_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version_code VARCHAR(50) NOT NULL,
  zip_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on app_versions
ALTER TABLE public.app_versions ENABLE ROW LEVEL SECURITY;

-- Allow public read access to active app_versions
CREATE POLICY "Public read active app versions"
ON public.app_versions FOR SELECT
USING (true);

-- Allow admins to insert/update/delete app versions
CREATE POLICY "Admins manage app versions"
ON public.app_versions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() AND users.role = 'ADMIN'
  ) OR
  auth.role() = 'service_role'
);
