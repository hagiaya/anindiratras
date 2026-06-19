import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { encodeHex } from "https://deno.land/std@0.208.0/encoding/hex.ts";

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
    
    const {
      order_id,
      transaction_status,
      fraud_status,
      status_code,
      gross_amount,
      signature_key,
      transaction_id
    } = payload

    const serverKey = Deno.env.get('MIDTRANS_SERVER_KEY') || ''

    // Verify signature
    const text = `${order_id}${status_code}${gross_amount}${serverKey}`
    const encoder = new TextEncoder()
    const data = encoder.encode(text)
    const hashBuffer = await crypto.subtle.digest('SHA-512', data)
    const generatedSignature = encodeHex(new Uint8Array(hashBuffer))

    if (generatedSignature !== signature_key) {
      return new Response(JSON.stringify({ error: 'Invalid signature' }), { 
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    let paymentStatus = 'UNPAID'
    let orderStatus = 'PENDING'

    if (transaction_status == 'capture') {
      if (fraud_status == 'accept') {
        paymentStatus = 'PAID'
      }
    } else if (transaction_status == 'settlement') {
      paymentStatus = 'PAID'
    } else if (transaction_status == 'cancel' || transaction_status == 'deny' || transaction_status == 'expire') {
      paymentStatus = 'FAILED'
      orderStatus = 'CANCELLED'
    } else if (transaction_status == 'pending') {
      paymentStatus = 'UNPAID'
    }

    // Update database
    const { error } = await supabaseAdmin
      .from('orders')
      .update({ 
        payment_status: paymentStatus,
        status: orderStatus,
        midtrans_trx_id: transaction_id
      })
      .eq('id', order_id)

    if (error) throw error

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
