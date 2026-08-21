import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ahtsdnehqexkvzygufmj.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFodHNkbmVocWV4a3Z6eWd1Zm1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3MDY0MzcsImV4cCI6MjA5NzI4MjQzN30.Hvd6xVuu5GzL8iZJVPk0lx4ZXUdAZQO4lXGjiEFlJEk'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
})
