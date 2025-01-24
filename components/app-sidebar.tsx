"use client"

import * as React from "react"
import { NavPages } from "@/components/nav-pages"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarRail,
} from "@/components/ui/sidebar"
import { createClient } from "@/lib/supabase/client"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [user, setUser] = React.useState<{
    name: string
    email: string
    avatar: string
    subscription: 'free' | 'pro' | 'admin'
  }>({
    name: "",
    email: "",
    avatar: "",
    subscription: "free"
  })

  const loadUser = React.useCallback(async () => {
    const supabase = createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    
    if (authUser) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (profile) {
        setUser({
          name: profile.nickname || authUser.email?.split('@')[0] || '',
          email: authUser.email || '',
          avatar: profile.avatar_url || '',
          subscription: profile.subscription || 'free'
        })
      }
    }
  }, [])

  React.useEffect(() => {
    loadUser()

    // Listen for profile updates
    const handleProfileUpdate = () => {
      loadUser()
    }
    window.addEventListener('profile-updated', handleProfileUpdate)

    return () => {
      window.removeEventListener('profile-updated', handleProfileUpdate)
    }
  }, [loadUser])

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarContent>
        <NavPages />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
