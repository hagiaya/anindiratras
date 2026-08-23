-- SQL Migration: Fix RLS Policies on orders and users tables for Admin & Driver Access

-- -------------------------------------------------------------
-- 1. FIX RLS ON public.orders
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

-- Comprehensive SELECT policy
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

-- Comprehensive INSERT policy for authenticated users
CREATE POLICY "Authenticated users insert orders"
ON public.orders FOR INSERT
TO authenticated
WITH CHECK (true);

-- Comprehensive UPDATE policy for Users, Drivers, and Admins
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

-- Comprehensive DELETE policy for Admins
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
-- 2. FIX RLS ON public.users FOR ADMIN & DRIVER JOINS
-- -------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users Admins Drivers view users" ON public.users;

-- SELECT policy: Users view own profile, Admins & Drivers can view all profiles for joins & contacts
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
-- 3. ENABLE REALTIME PUBLICATION FOR ORDERS
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
