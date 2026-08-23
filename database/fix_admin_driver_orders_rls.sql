-- SQL Migration: Comprehensive Fix for RLS Policies, Order Constraints, and User Sync across All Tables

-- -------------------------------------------------------------
-- 0. FIX ORDER TYPE CHECK CONSTRAINT (Allow AIRPORT & ANTAR_BANDARA)
-- -------------------------------------------------------------
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_order_type_check;

ALTER TABLE public.orders ADD CONSTRAINT orders_order_type_check 
CHECK (order_type IN ('CARPOOL', 'REGULAR', 'TITIP_BARANG', 'SEWA_MOBIL', 'AIRPORT', 'ANTAR_BANDARA'));

-- -------------------------------------------------------------
-- 0.1 AUTO-CREATE public.users RECORD FOR AUTH USERS IF MISSING
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, phone, email, full_name, role, status)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.phone, ''), NEW.raw_user_meta_data->>'phone', '08' || floor(random()*899999999 + 100000000)::text),
    NEW.email,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), 'Pelanggan'),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'role', ''), 'USER'),
    'ACTIVE'
  )
  ON CONFLICT (id) DO UPDATE SET
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Ensure all existing auth users have a record in public.users
INSERT INTO public.users (id, phone, email, full_name, role, status)
SELECT 
  id,
  COALESCE(NULLIF(phone, ''), raw_user_meta_data->>'phone', '08' || floor(random()*899999999 + 100000000)::text),
  email,
  COALESCE(NULLIF(raw_user_meta_data->>'full_name', ''), 'Pelanggan'),
  COALESCE(NULLIF(raw_user_meta_data->>'role', ''), 'USER'),
  'ACTIVE'
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- -------------------------------------------------------------
-- 1. FIX RLS ON public.bank_accounts
-- -------------------------------------------------------------
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active bank accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Admins can insert bank accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Admins can update bank accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Admins can delete bank accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Anyone can view bank accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Admins manage bank accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Admins insert bank accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Admins update bank accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Admins delete bank accounts" ON public.bank_accounts;

CREATE POLICY "Anyone can view bank accounts" 
ON public.bank_accounts FOR SELECT 
USING (
  is_active = true OR 
  EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'ADMIN') OR
  auth.role() = 'service_role' OR auth.jwt() ->> 'role' = 'ADMIN'
);

CREATE POLICY "Admins insert bank accounts" 
ON public.bank_accounts FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'ADMIN') OR
  auth.role() = 'service_role' OR auth.jwt() ->> 'role' = 'ADMIN'
);

CREATE POLICY "Admins update bank accounts" 
ON public.bank_accounts FOR UPDATE 
USING (
  EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'ADMIN') OR
  auth.role() = 'service_role' OR auth.jwt() ->> 'role' = 'ADMIN'
);

CREATE POLICY "Admins delete bank accounts" 
ON public.bank_accounts FOR DELETE 
USING (
  EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'ADMIN') OR
  auth.role() = 'service_role' OR auth.jwt() ->> 'role' = 'ADMIN'
);

-- -------------------------------------------------------------
-- 2. FIX RLS ON public.promos
-- -------------------------------------------------------------
ALTER TABLE public.promos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active promos" ON public.promos;
DROP POLICY IF EXISTS "Admins can manage promos" ON public.promos;
DROP POLICY IF EXISTS "Anyone can view promos" ON public.promos;
DROP POLICY IF EXISTS "Admins manage promos" ON public.promos;

CREATE POLICY "Anyone can view promos" 
ON public.promos FOR SELECT 
USING (
  is_active = true OR 
  EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'ADMIN') OR
  auth.role() = 'service_role' OR auth.jwt() ->> 'role' = 'ADMIN'
);

CREATE POLICY "Admins manage promos" 
ON public.promos FOR ALL 
USING (
  EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'ADMIN') OR
  auth.role() = 'service_role' OR auth.jwt() ->> 'role' = 'ADMIN'
);

-- -------------------------------------------------------------
-- 3. FIX RLS ON public.qris_settings
-- -------------------------------------------------------------
ALTER TABLE public.qris_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active qris" ON public.qris_settings;
DROP POLICY IF EXISTS "Admins can manage qris" ON public.qris_settings;
DROP POLICY IF EXISTS "Anyone can view qris" ON public.qris_settings;
DROP POLICY IF EXISTS "Admins manage qris" ON public.qris_settings;

CREATE POLICY "Anyone can view qris" 
ON public.qris_settings FOR SELECT 
USING (
  is_active = true OR 
  EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'ADMIN') OR
  auth.role() = 'service_role' OR auth.jwt() ->> 'role' = 'ADMIN'
);

CREATE POLICY "Admins manage qris" 
ON public.qris_settings FOR ALL 
USING (
  EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'ADMIN') OR
  auth.role() = 'service_role' OR auth.jwt() ->> 'role' = 'ADMIN'
);

-- -------------------------------------------------------------
-- 4. FIX RLS ON public.outlets
-- -------------------------------------------------------------
ALTER TABLE public.outlets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active outlets" ON public.outlets;
DROP POLICY IF EXISTS "Admins can manage outlets" ON public.outlets;
DROP POLICY IF EXISTS "Anyone can view outlets" ON public.outlets;
DROP POLICY IF EXISTS "Admins manage outlets" ON public.outlets;

CREATE POLICY "Anyone can view outlets" 
ON public.outlets FOR SELECT 
USING (
  is_active = true OR 
  EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'ADMIN') OR
  auth.role() = 'service_role' OR auth.jwt() ->> 'role' = 'ADMIN'
);

CREATE POLICY "Admins manage outlets" 
ON public.outlets FOR ALL 
USING (
  EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'ADMIN') OR
  auth.role() = 'service_role' OR auth.jwt() ->> 'role' = 'ADMIN'
);

-- -------------------------------------------------------------
-- 5. FIX RLS ON public.orders
-- -------------------------------------------------------------
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own orders" ON public.orders;
DROP POLICY IF EXISTS "Admin view all orders" ON public.orders;
DROP POLICY IF EXISTS "Users insert orders" ON public.orders;
DROP POLICY IF EXISTS "Admin and drivers update orders" ON public.orders;
DROP POLICY IF EXISTS "Users and Admins view orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated users insert orders" ON public.orders;
DROP POLICY IF EXISTS "Users and Admins update orders" ON public.orders;
DROP POLICY IF EXISTS "Admins delete orders" ON public.orders;
DROP POLICY IF EXISTS "Users Admins Drivers view orders" ON public.orders;
DROP POLICY IF EXISTS "Users Admins Drivers update orders" ON public.orders;

CREATE POLICY "Users Admins Drivers view orders"
ON public.orders FOR SELECT
USING (
  auth.uid() = user_id OR 
  auth.uid() = driver_id OR 
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() AND users.role = 'ADMIN'
  ) OR
  auth.role() = 'service_role' OR
  auth.jwt() ->> 'role' = 'ADMIN'
);

CREATE POLICY "Authenticated users insert orders"
ON public.orders FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users Admins Drivers update orders"
ON public.orders FOR UPDATE
USING (
  auth.uid() = user_id OR 
  auth.uid() = driver_id OR 
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() AND users.role = 'ADMIN'
  ) OR
  auth.role() = 'service_role' OR
  auth.jwt() ->> 'role' = 'ADMIN'
);

CREATE POLICY "Admins delete orders"
ON public.orders FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() AND users.role = 'ADMIN'
  ) OR
  auth.role() = 'service_role' OR
  auth.jwt() ->> 'role' = 'ADMIN'
);

-- -------------------------------------------------------------
-- 6. FIX RLS ON public.users
-- -------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users Admins Drivers view users" ON public.users;

CREATE POLICY "Users Admins Drivers view users" 
ON public.users FOR SELECT 
USING (
  auth.uid() = id OR 
  EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = auth.uid() AND u.role IN ('ADMIN', 'DRIVER')
  ) OR
  auth.role() = 'service_role' OR
  auth.jwt() ->> 'role' = 'ADMIN'
);

-- -------------------------------------------------------------
-- 7. ENABLE REALTIME PUBLICATION FOR ORDERS
-- -------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
