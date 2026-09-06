CREATE OR REPLACE FUNCTION public.is_admin() 
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.users 
    WHERE id = auth.uid() AND role = 'ADMIN'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_driver() 
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.users 
    WHERE id = auth.uid() AND role IN ('ADMIN', 'DRIVER')
  );
$$;

DROP POLICY IF EXISTS "Users Admins Drivers view users" ON public.users;

CREATE POLICY "Users Admins Drivers view users" 
ON public.users FOR SELECT 
USING (
  auth.uid() = id OR 
  public.is_admin_or_driver() OR
  auth.role() = 'service_role' OR
  auth.jwt() ->> 'role' = 'ADMIN'
);
