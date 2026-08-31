-- Add notification_sound_url
ALTER TABLE public.app_settings 
ADD COLUMN IF NOT EXISTS notification_sound_url TEXT;

-- Insert default row if not exists
INSERT INTO public.app_settings (id)
SELECT uuid_generate_v4()
WHERE NOT EXISTS (SELECT 1 FROM public.app_settings);

-- Drop previous bad RLS on app_settings that used JWT claim which doesn't exist by default
DROP POLICY IF EXISTS "Admins can manage app_settings" ON public.app_settings;
CREATE POLICY "Admins can manage app_settings" 
ON public.app_settings FOR ALL
USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'ADMIN'));

-- Also fix departure_times
DROP POLICY IF EXISTS "Admins can manage departure_times" ON public.departure_times;
CREATE POLICY "Admins can manage departure_times" 
ON public.departure_times FOR ALL
USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'ADMIN'));

-- Extra prices
DROP POLICY IF EXISTS "Admins can manage extra_prices" ON public.extra_prices;
CREATE POLICY "Admins can manage extra_prices" 
ON public.extra_prices FOR ALL
USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'ADMIN'));

-- Fix chats RLS
DROP POLICY IF EXISTS "Users can view their chats" ON public.chats;
CREATE POLICY "Users can view their chats"
ON public.chats FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can insert chats" ON public.chats;
CREATE POLICY "Users can insert chats"
ON public.chats FOR INSERT
WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Users can update their chats" ON public.chats;
CREATE POLICY "Users can update their chats"
ON public.chats FOR UPDATE
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Create storage bucket for sounds
INSERT INTO storage.buckets (id, name, public) 
VALUES ('sounds', 'sounds', true)
ON CONFLICT (id) DO NOTHING;

-- RLS for sounds bucket
CREATE POLICY "Anyone can read sounds"
ON storage.objects FOR SELECT
USING (bucket_id = 'sounds');

CREATE POLICY "Admins can insert sounds"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'sounds' AND 
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'ADMIN')
);

CREATE POLICY "Admins can update sounds"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'sounds' AND 
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'ADMIN')
);

CREATE POLICY "Admins can delete sounds"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'sounds' AND 
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'ADMIN')
);
