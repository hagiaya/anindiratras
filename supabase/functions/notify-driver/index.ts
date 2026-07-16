import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json()
    const record = payload.record;

    // Hanya notifikasi jika status PENDING
    if (!record || record.status !== 'PENDING') {
      return new Response("Not a new pending order.", { headers: corsHeaders, status: 200 })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Cari nomor HP semua driver
    const { data: drivers, error } = await supabase
      .from('users')
      .select('phone')
      .eq('role', 'DRIVER')
      .not('phone', 'is', null);

    if (error || !drivers || drivers.length === 0) {
      return new Response("No available drivers to notify.", { headers: corsHeaders, status: 200 })
    }

    // Format and gabungkan nomor telepon dengan koma untuk target Fonnte
    const formattedPhones = drivers
      .map(d => d.phone)
      .filter(p => p)
      .map(p => {
        let phone = p
        if (phone.startsWith('8')) phone = '62' + phone
        else if (phone.startsWith('0')) phone = '62' + phone.substring(1)
        return phone
      })

    const phones = formattedPhones.join(',');

    if (!phones) {
      return new Response("No valid phone numbers found.", { headers: corsHeaders, status: 200 })
    }

    const fonnteToken = Deno.env.get('FONNTE_TOKEN');
    
    if (!fonnteToken) {
      throw new Error("FONNTE_TOKEN is not set in Supabase Secrets");
    }

    const messageText = `🚨 *ORDERAN BARU MASUK!* 🚨\n\nLayanan: *${record.order_type.replace('_', ' ')}*\nTotal: *Rp ${record.total_price.toLocaleString('id-ID')}*\n\nSegera buka aplikasi Anindira Trans untuk mengambil orderan ini.`;

    // Tembak API Fonnte
    // Menggunakan URLSearchParams sesuai format yang diterima Fonnte
    const response = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        'Authorization': fonnteToken
      },
      body: new URLSearchParams({
        target: phones,
        message: messageText
      })
    });

    const result = await response.json();

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    })

  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    })
  }
})
