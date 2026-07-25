-- Tambahkan tabel yang kurang
CREATE TABLE IF NOT EXISTS public.departure_times (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  time_string VARCHAR(10) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.extra_prices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  amount DECIMAL(12, 2) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.app_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profit_percentage DECIMAL(5, 2) DEFAULT 0,
  maintenance_mode BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies untuk tabel baru
ALTER TABLE public.departure_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extra_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view departure_times" 
ON public.departure_times FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage departure_times" 
ON public.departure_times FOR ALL
USING (auth.jwt() ->> 'role' = 'ADMIN');

CREATE POLICY "Anyone can view extra_prices" 
ON public.extra_prices FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage extra_prices" 
ON public.extra_prices FOR ALL
USING (auth.jwt() ->> 'role' = 'ADMIN');

CREATE POLICY "Anyone can view app_settings" 
ON public.app_settings FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage app_settings" 
ON public.app_settings FOR ALL
USING (auth.jwt() ->> 'role' = 'ADMIN');
