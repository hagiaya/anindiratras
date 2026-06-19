import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  const { data: routes, error: rErr } = await supabase.from('routes').select('*').limit(1);
  const { data: prices, error: pErr } = await supabase.from('product_prices').select('*').limit(1);
  
  console.log('Routes error:', rErr);
  console.log('Prices error:', pErr);
}
checkTables();
