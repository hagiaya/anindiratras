-- SQL Migration: Fix RLS Policy on public.orders for Admin Access

-- 1. Enable RLS on orders table
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing restrictive select policy if present
DROP POLICY IF EXISTS "Users view own orders" ON public.orders;
DROP POLICY IF EXISTS "Admin view all orders" ON public.orders;
DROP POLICY IF EXISTS "Users insert orders" ON public.orders;
DROP POLICY IF EXISTS "Admin and drivers update orders" ON public.orders;

-- 3. Create comprehensive SELECT policy allowing Users to view their own orders and Admins/Drivers to view all orders
CREATE POLICY "Users and Admins view orders"
ON public.orders FOR SELECT
USING (
  auth.uid() = user_id OR 
  auth.uid() = driver_id OR 
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() AND users.role = 'ADMIN'
  ) OR
  auth.role() = 'service_role'
);

-- 4. Create INSERT policy allowing authenticated users to create orders
CREATE POLICY "Authenticated users insert orders"
ON public.orders FOR INSERT
TO authenticated
WITH CHECK (true);

-- 5. Create UPDATE policy allowing Users, Drivers, and Admins to update orders
CREATE POLICY "Users and Admins update orders"
ON public.orders FOR UPDATE
USING (
  auth.uid() = user_id OR 
  auth.uid() = driver_id OR 
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() AND users.role = 'ADMIN'
  ) OR
  auth.role() = 'service_role'
);

-- 6. Create DELETE policy for Admins
CREATE POLICY "Admins delete orders"
ON public.orders FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() AND users.role = 'ADMIN'
  ) OR
  auth.role() = 'service_role'
);
