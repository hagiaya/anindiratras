ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_order_type_check;

ALTER TABLE public.orders ADD CONSTRAINT orders_order_type_check 
CHECK (order_type IN ('CARPOOL', 'REGULAR', 'TITIP_BARANG', 'SEWA_MOBIL', 'AIRPORT'));
