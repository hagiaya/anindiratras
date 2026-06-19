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
    const { phone } = await req.json()
    if (!phone) {
      return new Response(JSON.stringify({ error: 'Phone number is required' }), { 
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 5 * 60000).toISOString() // 5 mins

    // Save to DB
    const { error: dbError } = await supabaseAdmin
      .from('otp_codes')
      .insert({ phone, code: otp, expires_at: expiresAt })

    if (dbError) throw dbError

    // Send via Fonnte
    const fonnteToken = Deno.env.get('FONNTE_TOKEN')
    if (fonnteToken) {
      const response = await fetch('https://api.fonnte.com/send', {
        method: 'POST',
        headers: {
          'Authorization': fonnteToken
        },
        body: new URLSearchParams({
          target: phone,
          message: `*AnindiraTrans Security*\n\nKode verifikasi WhatsApp Anda adalah: *${otp}*\n\nBerlaku selama 5 menit. Jangan berikan kode ini kepada siapapun.`
        })
      })
      const result = await response.json()
      console.log('Fonnte response:', result)
    } else {
      console.warn('FONNTE_TOKEN not set. OTP generated but not sent.')
    }

    return new Response(JSON.stringify({ success: true, message: 'OTP sent' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
