-- 1. Create carpool_schedules table
CREATE TABLE public.carpool_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_id UUID NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
  car_type VARCHAR(20) NOT NULL CHECK (car_type IN ('3_SEATS', '4_SEATS', '5_SEATS', '6_SEATS', '7_SEATS')),
  departure_date DATE NOT NULL,
  departure_time VARCHAR(10) NOT NULL,
  seat_prices JSONB NOT NULL DEFAULT '{}'::jsonb,
  driver_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for schedules
ALTER TABLE public.carpool_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active carpool schedules"
ON public.carpool_schedules FOR SELECT
USING (is_active = true OR auth.jwt() ->> 'role' = 'ADMIN');

CREATE POLICY "Admins can manage carpool schedules"
ON public.carpool_schedules FOR ALL
USING (auth.jwt() ->> 'role' = 'ADMIN');


-- 2. Create carpool_booked_seats table to lock seats
CREATE TABLE public.carpool_booked_seats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  schedule_id UUID NOT NULL REFERENCES public.carpool_schedules(id) ON DELETE CASCADE,
  seat_number INT NOT NULL,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- The core lock: Prevents duplicate seat bookings for the same schedule
  UNIQUE(schedule_id, seat_number)
);

-- Enable RLS for booked seats
ALTER TABLE public.carpool_booked_seats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view booked seats"
ON public.carpool_booked_seats FOR SELECT
USING (true);

-- Allow authenticated users to insert (handled safely by RPC but we allow standard access for simplicity)
CREATE POLICY "Users can view and create booked seats"
ON public.carpool_booked_seats FOR ALL
USING (auth.jwt() ->> 'role' IN ('USER', 'ADMIN', 'DRIVER'))
WITH CHECK (auth.jwt() ->> 'role' IN ('USER', 'ADMIN', 'DRIVER'));


-- 3. Create RPC Function to handle atomic Checkout
CREATE OR REPLACE FUNCTION book_carpool_seats(
  p_user_id UUID,
  p_schedule_id UUID,
  p_route_id UUID,
  p_pickup_address TEXT,
  p_pickup_lat DECIMAL,
  p_pickup_lng DECIMAL,
  p_dropoff_address TEXT,
  p_dropoff_lat DECIMAL,
  p_dropoff_lng DECIMAL,
  p_package_details TEXT,
  p_total_price DECIMAL,
  p_payment_method TEXT,
  p_payment_status TEXT,
  p_promo_id UUID,
  p_seats INT[]
) RETURNS UUID AS $$
DECLARE
  v_order_id UUID;
  v_seat INT;
BEGIN
  -- Insert order
  INSERT INTO public.orders (
    user_id, order_type, route_id, pickup_address, pickup_lat, pickup_lng,
    dropoff_address, dropoff_lat, dropoff_lng, package_details, total_price,
    payment_method, payment_status, promo_id, status
  ) VALUES (
    p_user_id, 'CARPOOL', p_route_id, p_pickup_address, p_pickup_lat, p_pickup_lng,
    p_dropoff_address, p_dropoff_lat, p_dropoff_lng, p_package_details, p_total_price,
    p_payment_method, p_payment_status, p_promo_id, 'PENDING'
  ) RETURNING id INTO v_order_id;

  -- Insert seats
  FOREACH v_seat IN ARRAY p_seats
  LOOP
    INSERT INTO public.carpool_booked_seats (schedule_id, seat_number, order_id)
    VALUES (p_schedule_id, v_seat, v_order_id);
  END LOOP;

  RETURN v_order_id;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Kursi sudah dipesan oleh orang lain. Silakan pilih kursi lain.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
