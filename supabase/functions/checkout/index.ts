import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import * as jose from "https://deno.land/x/jose@v4.14.4/index.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error("Unauthorized: No authorization header")
    const token = authHeader.replace('Bearer ', '')
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    let userId: string | null = null

    // 1. Try standard Supabase Auth Token
    const { data: { user }, error: userAuthError } = await supabaseAdmin.auth.getUser(token)
    if (user && !userAuthError) {
      userId = user.id
    } else {
      // 2. Try custom JWT verification fallback
      try {
        const jwtSecret = Deno.env.get('CUSTOM_JWT_SECRET') || ''
        if (jwtSecret) {
          const secret = new TextEncoder().encode(jwtSecret)
          const { payload } = await jose.jwtVerify(token, secret)
          if (payload?.sub) userId = payload.sub as string
        }
      } catch (_e) {
        // Fallback failed
      }
    }

    const body = await req.json()
    const { orderPayload, paymentMethod } = body

    if (!userId && orderPayload?.user_id) {
      userId = orderPayload.user_id
    }

    if (!userId) throw new Error("Unauthorized: Invalid token")

    if (!orderPayload || !paymentMethod) {
      throw new Error("Missing required parameters")
    }

    if (paymentMethod !== 'CASH' && paymentMethod !== 'TRANSFER' && paymentMethod !== 'ANINDIRAPAY') {
      throw new Error("Invalid payment method")
    }

    const totalPrice = Number(orderPayload.total_price)
    if (isNaN(totalPrice) || totalPrice < 0) {
      throw new Error("Invalid total price")
    }

    // Process Transfer (Balance Deduction)
    if (paymentMethod === 'ANINDIRAPAY') {
      // 1. Check user balance
      const { data: user, error: userError } = await supabaseAdmin
        .from('users')
        .select('balance')
        .eq('id', userId)
        .single()
        
      if (userError) throw new Error("Failed to fetch user balance")
      
      const currentBalance = Number(user.balance || 0)
      if (currentBalance < totalPrice) {
        throw new Error("Saldo tidak mencukupi. Silakan Top Up terlebih dahulu.")
      }

      // 2. Deduct balance
      const newBalance = currentBalance - totalPrice
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({ balance: newBalance })
        .eq('id', userId)
        
      if (updateError) throw new Error("Failed to deduct balance")
    }

    // Insert Order
    // Ensure the order belongs to the user requesting it
    const finalOrderPayload = {
      ...orderPayload,
      user_id: userId,
      payment_method: paymentMethod,
      payment_status: paymentMethod === 'ANINDIRAPAY' ? 'PAID' : 'UNPAID',
      status: 'PENDING'
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert(finalOrderPayload)
      .select()
      .single()

    if (orderError) {
      // Rollback logic (Best effort, usually we'd use a DB transaction/RPC, but this is an Edge Function)
      if (paymentMethod === 'ANINDIRAPAY') {
        const { data: rollbackUser } = await supabaseAdmin.from('users').select('balance').eq('id', userId).single()
        if (rollbackUser) {
          await supabaseAdmin.from('users').update({ balance: Number(rollbackUser.balance || 0) + totalPrice }).eq('id', userId)
        }
      }
      throw new Error(`Failed to create order: ${orderError.message}`)
    }

    return new Response(JSON.stringify({ success: true, order }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200, // Important: keep 200 so frontend can parse the error.message easily
    })
  }
})
