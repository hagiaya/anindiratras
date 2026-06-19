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
    const { orderId, amount, customerDetails } = await req.json()
    if (!orderId || !amount) {
      return new Response(JSON.stringify({ error: 'orderId and amount are required' }), { 
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    const serverKey = Deno.env.get('MIDTRANS_SERVER_KEY')
    const isProduction = Deno.env.get('MIDTRANS_IS_PRODUCTION') === 'true'
    const midtransUrl = isProduction 
      ? 'https://app.midtrans.com/snap/v1/transactions' 
      : 'https://app.sandbox.midtrans.com/snap/v1/transactions'

    // CRITICAL: gross_amount must be an integer
    const roundedAmount = Math.round(Number(amount))

    const payload = {
      transaction_details: {
        order_id: orderId,
        gross_amount: roundedAmount
      },
      customer_details: customerDetails,
      callbacks: {
        finish: "anindira://payment/finish",
        error: "anindira://payment/error",
        pending: "anindira://payment/pending"
      }
    }

    const authString = btoa(`${serverKey}:`)
    
    const response = await fetch(midtransUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`
      },
      body: JSON.stringify(payload)
    })

    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(`Midtrans API Error: ${data.message || JSON.stringify(data)}`)
    }

    return new Response(JSON.stringify({ 
      token: data.token, 
      redirect_url: data.redirect_url 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
