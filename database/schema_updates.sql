-- Fix check constraint on product_prices to allow 'AIRPORT' and 'ANTAR_BANDARA'
ALTER TABLE public.product_prices DROP CONSTRAINT IF EXISTS product_prices_product_type_check;

ALTER TABLE public.product_prices ADD CONSTRAINT product_prices_product_type_check 
CHECK (product_type IN ('CARPOOL', 'TITIP_BARANG', 'ANTAR_BANDARA', 'AIRPORT', 'SEWA_MOBIL'));

-- Fix check constraint on orders to allow 'AIRPORT' and 'ANTAR_BANDARA'
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_order_type_check;

ALTER TABLE public.orders ADD CONSTRAINT orders_order_type_check 
CHECK (order_type IN ('CARPOOL', 'REGULAR', 'TITIP_BARANG', 'SEWA_MOBIL', 'AIRPORT', 'ANTAR_BANDARA'));

-- Add route_type column to departure_times if it doesn't exist
ALTER TABLE public.departure_times 
ADD COLUMN IF NOT EXISTS route_type VARCHAR(20) DEFAULT 'DALAM_KOTA' CHECK (route_type IN ('DALAM_KOTA', 'LUAR_KOTA'));

-- Seed departure times: 7 times for DALAM_KOTA, 4 times for LUAR_KOTA
INSERT INTO public.departure_times (time_string, route_type)
VALUES
  ('07.00', 'DALAM_KOTA'),
  ('09.00', 'DALAM_KOTA'),
  ('11.00', 'DALAM_KOTA'),
  ('13.00', 'DALAM_KOTA'),
  ('15.00', 'DALAM_KOTA'),
  ('17.00', 'DALAM_KOTA'),
  ('19.00', 'DALAM_KOTA'),
  ('08.00', 'LUAR_KOTA'),
  ('12.00', 'LUAR_KOTA'),
  ('16.00', 'LUAR_KOTA'),
  ('20.00', 'LUAR_KOTA')
ON CONFLICT DO NOTHING;

-- Seed default product prices for TITIP_BARANG
INSERT INTO public.product_prices (product_type, base_price, description)
VALUES
  ('TITIP_BARANG', 15000, 'BASE_PRICE_DALAM_KOTA'),
  ('TITIP_BARANG', 3000, 'PRICE_PER_KG_DALAM_KOTA'),
  ('TITIP_BARANG', 35000, 'BASE_PRICE_LUAR_KOTA'),
  ('TITIP_BARANG', 7000, 'PRICE_PER_KG_LUAR_KOTA')
ON CONFLICT DO NOTHING;

-- Seed default product prices for AIRPORT
INSERT INTO public.product_prices (product_type, base_price, description)
VALUES
  ('AIRPORT', 50000, 'BASE_PRICE_AIRPORT_KECIL'),
  ('AIRPORT', 5000, 'PRICE_PER_KM_AIRPORT_KECIL'),
  ('AIRPORT', 75000, 'BASE_PRICE_AIRPORT_BESAR'),
  ('AIRPORT', 7000, 'PRICE_PER_KM_AIRPORT_BESAR')
ON CONFLICT DO NOTHING;

-- Seed default SEWA_MOBIL cars if not present
INSERT INTO public.product_prices (product_type, base_price, seat_type, description)
VALUES
  ('SEWA_MOBIL', 350000, '6', '{"name":"Avanza / Xenia","seats":6,"inCityPrice":350000,"outCityPrice":500000}'),
  ('SEWA_MOBIL', 600000, '7', '{"name":"Innova Reborn","seats":7,"inCityPrice":600000,"outCityPrice":850000}'),
  ('SEWA_MOBIL', 1200000, '14', '{"name":"Toyota HiAce","seats":14,"inCityPrice":1200000,"outCityPrice":1600000}')
ON CONFLICT DO NOTHING;
