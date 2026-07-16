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

    if (!record || !record.receiver_id || !record.message) {
      return new Response("Not a valid chat message.", { headers: corsHeaders, status: 200 })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Ambil nama pengirim
    const { data: sender } = await supabase
      .from('users')
      .select('full_name')
      .eq('id', record.sender_id)
      .single();

    const senderName = sender?.full_name || 'Seseorang';

    // Ambil nomor HP penerima
    const { data: receiver } = await supabase
      .from('users')
      .select('phone')
      .eq('id', record.receiver_id)
      .single();

    if (!receiver || !receiver.phone) {
      return new Response("Receiver has no phone number.", { headers: corsHeaders, status: 200 })
    }

    const fonnteToken = Deno.env.get('FONNTE_TOKEN');
    
    if (!fonnteToken) {
      throw new Error("FONNTE_TOKEN is not set in Supabase Secrets");
    }

    const messageText = `💬 *Pesan Baru di Anindira Trans*\n\nDari: *${senderName}*\nPesan: _"${record.message}"_\n\nSegera cek dan balas melalui aplikasi Anindira Trans.`;

    let targetPhone = receiver.phone
    if (targetPhone.startsWith('8')) targetPhone = '62' + targetPhone
    else if (targetPhone.startsWith('0')) targetPhone = '62' + targetPhone.substring(1)

    const response = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        'Authorization': fonnteToken
      },
      body: new URLSearchParams({
        target: targetPhone,
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
