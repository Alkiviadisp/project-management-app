import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/lib/supabase/database.types'

// Intercept and silence Supabase auth errors
if (typeof window !== 'undefined') {
  const originalFetch = window.fetch
  window.fetch = function (input, init) {
    if (input.toString().includes('supabase.co/auth/v1/token')) {
      return originalFetch(input, init).catch(() => {
        // Return a fake response to prevent error from bubbling up
        return new Response(JSON.stringify({ error: { message: 'Invalid credentials' } }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        })
      })
    }
    return originalFetch(input, init)
  }
}

export const createClient = () => createClientComponentClient<Database>() 