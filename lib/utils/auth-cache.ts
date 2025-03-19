import { createClient } from '@/lib/supabase/client'

let cachedUser: any = null
let lastChecked: number = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes in milliseconds

export async function getCurrentUser() {
  // If we have a cached user and the cache hasn't expired, return it
  if (cachedUser && (Date.now() - lastChecked) < CACHE_DURATION) {
    return cachedUser
  }

  // Otherwise, fetch the user and update cache
  const supabase = createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error) {
    cachedUser = null
  } else {
    cachedUser = user
    lastChecked = Date.now()
  }

  return cachedUser
}

// Call this when you need to invalidate the cache (e.g., on logout)
export function clearUserCache() {
  cachedUser = null
  lastChecked = 0
} 