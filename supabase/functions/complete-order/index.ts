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
    
    const jwtSecret = Deno.env.get('CUSTOM_JWT_SECRET') || ''
    const secret = new TextEncoder().encode(jwtSecret)
    const { payload } = await jose.jwtVerify(token, secret)
    const driverId = payload.sub
    if (!driverId) throw new Error("Unauthorized: Invalid token")

    const body = await req.json()
    const { orderId } = body

    if (!orderId) {
      throw new Error("Missing orderId parameter")
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify driver exists
    const { data: driver, error: driverError } = await supabaseAdmin
      .from('users')
      .select('balance, role')
      .eq('id', driverId)
      .single()

    if (driverError || driver?.role !== 'DRIVER') {
      throw new Error("Hanya driver yang bisa menyelesaikan pesanan")
    }

    // Fetch order details
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, driver_id, total_price, payment_method, status')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      throw new Error("Pesanan tidak ditemukan")
    }

    if (order.driver_id !== driverId) {
      throw new Error("Pesanan ini bukan milik Anda")
    }

    if (order.status === 'COMPLETED') {
      throw new Error("Pesanan ini sudah diselesaikan sebelumnya")
    }

    const totalPrice = Number(order.total_price)
    const currentBalance = Number(driver.balance || 0)
    let newBalance = currentBalance

    if (order.payment_method === 'CASH') {
      // 10% Commission Deduction
      const commission = totalPrice * 0.10
      newBalance = currentBalance - commission
    } else if (order.payment_method === 'TRANSFER') {
      // Driver gets 90% of the price
      const earnings = totalPrice * 0.90
      newBalance = currentBalance + earnings
    }

    // Update Driver Balance
    const { error: balanceUpdateError } = await supabaseAdmin
      .from('users')
      .update({ balance: newBalance })
      .eq('id', driverId)

    if (balanceUpdateError) {
      throw new Error("Gagal mengupdate saldo driver")
    }

    // Update Order Status
    const { error: statusUpdateError } = await supabaseAdmin
      .from('orders')
      .update({ 
        status: 'COMPLETED',
        payment_status: 'PAID' // If cash, it's paid to driver. If transfer, already paid.
      })
      .eq('id', orderId)

    if (statusUpdateError) {
      // Rollback best effort
      await supabaseAdmin.from('users').update({ balance: currentBalance }).eq('id', driverId)
      throw new Error("Gagal mengupdate status pesanan")
    }

    return new Response(JSON.stringify({ success: true, newBalance }), {
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
