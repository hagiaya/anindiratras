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
    const { phone, code, isRegistering, registrationData } = await req.json()
    if (!phone || !code) {
      return new Response(JSON.stringify({ error: 'Phone and code are required' }), { 
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify OTP
    const { data: otpData, error: otpError } = await supabaseAdmin
      .from('otp_codes')
      .select('*')
      .eq('phone', phone)
      .eq('code', code)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (otpError || !otpData) {
      return new Response(JSON.stringify({ error: 'Invalid or expired OTP' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Delete used OTP
    await supabaseAdmin.from('otp_codes').delete().eq('id', otpData.id)

    // Find user
    let { data: user } = await supabaseAdmin.from('users').select('*').eq('phone', phone).single()
    
    if (isRegistering) {
      if (user) {
        return new Response(JSON.stringify({ error: 'Phone number already registered' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      
      const role = registrationData?.role || 'USER'
      const fakeEmail = registrationData?.email || `${phone}@anindiratrans.local`
      
      const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: fakeEmail,
        email_confirm: true,
        password: Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8),
      })
      
      if (createError) throw createError
      
      // Insert public.users
      const { data: newUser, error: insertError } = await supabaseAdmin.from('users').insert({
        id: authUser.user.id,
        phone,
        email: registrationData?.email || null,
        full_name: registrationData?.full_name || null,
        role,
        status: role === 'DRIVER' ? 'INACTIVE' : 'ACTIVE' // drivers need admin approval
      }).select().single()
      
      if (insertError) throw insertError
      user = newUser

      // If driver, insert driver_profiles
      if (role === 'DRIVER') {
        await supabaseAdmin.from('driver_profiles').insert({
          user_id: user.id,
          license_number: registrationData?.license_number,
          car_type: registrationData?.car_type,
          car_color: registrationData?.car_color,
          car_plate_number: registrationData?.car_plate_number,
          seat_layout: registrationData?.seat_layout
        })
      }
    } else {
      if (!user) {
        return new Response(JSON.stringify({ error: 'Phone number not registered. Please sign up.' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
    }

    // Sign JWT
    const jwtSecret = Deno.env.get('CUSTOM_JWT_SECRET') || ''
    const secret = new TextEncoder().encode(jwtSecret)
    const alg = 'HS256'
    
    const token = await new jose.SignJWT({
      aud: 'authenticated',
      role: 'authenticated',
      sub: user.id,
      email: user.email || `${phone}@anindiratrans.local`,
      phone: phone,
      app_metadata: { provider: 'phone' },
      user_metadata: { role: user.role }
    })
      .setProtectedHeader({ alg })
      .setIssuedAt()
      .setExpirationTime('30d')
      .sign(secret)

    return new Response(JSON.stringify({ 
      success: true, 
      session: {
        access_token: token,
        token_type: 'bearer',
        expires_in: 2592000,
        user: { id: user.id, phone: user.phone, role: user.role }
      } 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  }
})
