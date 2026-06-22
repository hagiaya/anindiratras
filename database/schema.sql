-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- USERS TABLE
-- Stores both User and Driver profiles
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone VARCHAR(20) UNIQUE NOT NULL,
  email VARCHAR(255),
  full_name VARCHAR(100),
  role VARCHAR(20) DEFAULT 'USER' CHECK (role IN ('USER', 'DRIVER', 'ADMIN')),
  status VARCHAR(20) DEFAULT 'INACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'BANNED')),
  balance DECIMAL(12, 2) DEFAULT 0,
  fcm_token TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- OTP CODES TABLE
CREATE TABLE public.otp_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone VARCHAR(20) NOT NULL,
  code VARCHAR(10) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- DRIVER PROFILES TABLE (extension of users table)
CREATE TABLE public.driver_profiles (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  license_number VARCHAR(50),
  car_type VARCHAR(50),
  car_color VARCHAR(50),
  car_plate_number VARCHAR(20),
  seat_layout VARCHAR(50), -- e.g., '4_SEATS', '5_SEATS', '6_SEATS', '7_SEATS'
  is_available BOOLEAN DEFAULT false,
  rating DECIMAL(3, 2) DEFAULT 5.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ROUTES TABLE
-- Defined by Admin
CREATE TABLE public.routes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  route_type VARCHAR(20) DEFAULT 'DALAM_KOTA' CHECK (route_type IN ('DALAM_KOTA', 'LUAR_KOTA')),
  origin_city VARCHAR(100),
  destination_city VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PRODUCT SETTINGS TABLE (Prices)
CREATE TABLE public.product_prices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_type VARCHAR(50) NOT NULL CHECK (product_type IN ('CARPOOL', 'TITIP_BARANG', 'ANTAR_BANDARA', 'SEWA_MOBIL')),
  route_id UUID REFERENCES public.routes(id) ON DELETE SET NULL, -- for CARPOOL
  seat_type VARCHAR(50), -- for CARPOOL (e.g., 'FRONT', 'MIDDLE', 'BACK')
  base_price DECIMAL(12, 2) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ORDERS TABLE
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id),
  driver_id UUID REFERENCES public.users(id),
  order_type VARCHAR(50) NOT NULL CHECK (order_type IN ('CARPOOL', 'TITIP_BARANG', 'ANTAR_BANDARA', 'SEWA_MOBIL')),
  route_id UUID REFERENCES public.routes(id),
  
  -- Locations
  pickup_address TEXT,
  pickup_lat DECIMAL(10, 8),
  pickup_lng DECIMAL(11, 8),
  dropoff_address TEXT,
  dropoff_lat DECIMAL(10, 8),
  dropoff_lng DECIMAL(11, 8),
  
  -- Details
  seat_selected VARCHAR(255), -- JSON array string or comma separated if multiple
  package_details TEXT, -- For titip barang
  rental_duration_hours INT, -- For sewa mobil
  
  -- Status and Payments
  status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ASSIGNED', 'ON_THE_WAY', 'COMPLETED', 'CANCELLED')),
  total_price DECIMAL(12, 2) NOT NULL,
  payment_status VARCHAR(20) DEFAULT 'UNPAID' CHECK (payment_status IN ('UNPAID', 'PAID', 'REFUNDED')),
  midtrans_trx_id VARCHAR(100),
  payment_url TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- REVIEWS TABLE
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id),
  user_id UUID NOT NULL REFERENCES public.users(id),
  driver_id UUID NOT NULL REFERENCES public.users(id),
  rating INT CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CHATS TABLE (for In-App Chat)
CREATE TABLE public.chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES public.orders(id),
  sender_id UUID NOT NULL REFERENCES public.users(id),
  receiver_id UUID NOT NULL REFERENCES public.users(id),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- BANNERS TABLE
CREATE TABLE public.banners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(100),
  image_url TEXT NOT NULL,
  target_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TRANSACTIONS TABLE
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id),
  type VARCHAR(50) NOT NULL CHECK (type IN ('TOP_UP', 'PAYMENT')),
  amount DECIMAL(12, 2) NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'VERIFIED', 'REJECTED')),
  receipt_url TEXT,
  order_id UUID REFERENCES public.orders(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SET RLS (Row Level Security) - Basic Examples
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own profile
CREATE POLICY "Users can view own profile" 
ON public.users FOR SELECT 
USING (auth.uid() = id OR auth.jwt() ->> 'role' = 'ADMIN');

-- Orders policies
CREATE POLICY "Users view own orders"
ON public.orders FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = driver_id OR auth.jwt() ->> 'role' = 'ADMIN');

-- Transactions policies
CREATE POLICY "Users view own transactions"
ON public.transactions FOR SELECT
USING (auth.uid() = user_id OR auth.jwt() ->> 'role' = 'ADMIN');

CREATE POLICY "Users can insert transactions"
ON public.transactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Note: Proper RLS for driver assignments will be created via Supabase dashboard or migrations.

-- BANK ACCOUNTS TABLE
CREATE TABLE public.bank_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bank_name VARCHAR(100) NOT NULL,
  account_number VARCHAR(100) NOT NULL,
  account_holder VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bank Accounts Policies
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active bank accounts" 
ON public.bank_accounts FOR SELECT 
USING (is_active = true OR auth.jwt() ->> 'role' = 'ADMIN');

CREATE POLICY "Admins can insert bank accounts" 
ON public.bank_accounts FOR INSERT 
WITH CHECK (auth.jwt() ->> 'role' = 'ADMIN');

CREATE POLICY "Admins can update bank accounts" 
ON public.bank_accounts FOR UPDATE 
USING (auth.jwt() ->> 'role' = 'ADMIN');

CREATE POLICY "Admins can delete bank accounts" 
ON public.bank_accounts FOR DELETE 
USING (auth.jwt() ->> 'role' = 'ADMIN');

-- STORAGE BUCKETS
INSERT INTO storage.buckets (id, name, public) 
VALUES ('payment_receipts', 'payment_receipts', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Give public access to payment receipts" ON storage.objects
FOR SELECT USING (bucket_id = 'payment_receipts');

CREATE POLICY "Allow authenticated uploads to payment receipts" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'payment_receipts');
