"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { FileInput } from "@/components/ui/file-input"
import { toast } from "sonner"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { BadgeCheck, Crown, KeyRound, User } from "lucide-react"
import { Badge } from "@/components/ui/badge"

// Separate schema for profile form
const profileFormSchema = z.object({
  nickname: z.string().min(3, "Nickname must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
})

// Separate schema for password form
const passwordFormSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  confirmNewPassword: z.string()
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: "Passwords don't match",
  path: ["confirmNewPassword"],
})

type SubscriptionType = 'free' | 'pro' | 'admin'

interface User {
  id: string
  email: string
  nickname: string
  avatar_url: string
  subscription: SubscriptionType
}

const subscriptionStyles = {
  free: "bg-muted hover:bg-muted/80",
  pro: "bg-gradient-to-r from-blue-500/80 to-blue-400/80 text-white hover:from-blue-500/70 hover:to-blue-400/70",
  admin: "bg-gradient-to-r from-purple-500/80 to-purple-400/80 text-white hover:from-purple-500/70 hover:to-purple-400/70",
} as const

const subscriptionColors = {
  free: "bg-muted",
  pro: "bg-blue-500",
  admin: "bg-purple-500",
} as const

const subscriptionIcons = {
  free: BadgeCheck,
  pro: Crown,
  admin: Crown,
} as const

export default function AccountPage() {
  const [isLoadingProfile, setIsLoadingProfile] = React.useState(false)
  const [isLoadingPassword, setIsLoadingPassword] = React.useState(false)
  const [avatarFile, setAvatarFile] = React.useState<File | null>(null)
  const [user, setUser] = React.useState<User | null>(null)
  const supabase = createClient()

  // Separate form for profile
  const profileForm = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      email: "",
      nickname: "",
    },
    mode: "onChange"
  })

  // Separate form for password
  const passwordForm = useForm<z.infer<typeof passwordFormSchema>>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
    mode: "onChange"
  })

  React.useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (profile) {
          setUser({ ...user, ...profile })
          profileForm.reset({
            email: user.email || "",
            nickname: profile.nickname || "",
          })
        }
      }
    }
    loadUser()
  }, [])

  async function onProfileSubmit(values: z.infer<typeof profileFormSchema>) {
    try {
      setIsLoadingProfile(true)
      let hasChanges = false

      // Handle avatar upload if changed
      let avatarUrl = user?.avatar_url
      if (avatarFile) {
        hasChanges = true
        const fileExt = avatarFile.name.split('.').pop()
        if (!user) {
          throw new Error("User not found")
        }

        // Delete old avatar if it exists
        if (user?.avatar_url) {
          try {
            // Extract just the filename from the URL
            const filename = user.avatar_url.split('/').pop()?.split('?')[0]
            if (filename) {
              console.log('Attempting to delete:', filename)
              
              const { error: deleteError } = await supabase.storage
                .from('avatars')
                .remove([filename])

              if (deleteError) {
                console.error('Failed to delete old avatar:', deleteError)
                toast.error("Failed to delete old avatar", {
                  description: "Your new avatar will still be uploaded.",
                  duration: 3000,
                })
              } else {
                console.log('Successfully deleted old avatar')
              }
            }
          } catch (error) {
            console.error('Error while trying to delete old avatar:', error)
          }
        }

        // Upload new avatar
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile, {
            cacheControl: '3600',
            upsert: false
          })

        if (uploadError) {
          if (uploadError.message.includes('duplicate')) {
            toast.error("Upload Failed", {
              description: "A file with this name already exists. Please try again.",
              duration: 5000,
            })
          } else {
            toast.error("Upload Failed", {
              description: "Failed to upload avatar. Please try again.",
              duration: 5000,
            })
          }
          throw uploadError
        }

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName)

        avatarUrl = publicUrl
        toast.success("Avatar Updated", {
          description: "Your profile picture has been updated successfully!",
          duration: 3000,
        })
      }

      // Update profile if nickname changed
      if (values.nickname !== user?.nickname) {
        hasChanges = true
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            nickname: values.nickname,
            avatar_url: avatarUrl,
          })
          .eq('id', user?.id)

        if (updateError) throw updateError
        
        toast.success("Profile Updated", {
          description: "Your profile information has been updated successfully!",
          duration: 3000,
        })
      } else if (avatarFile) {
        // Update just the avatar_url if only avatar changed
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            avatar_url: avatarUrl,
          })
          .eq('id', user?.id)

        if (updateError) throw updateError
      }

      if (hasChanges) {
        window.dispatchEvent(new CustomEvent('profile-updated'))
      }
    } catch (error) {
      console.error(error)
      toast.error("Update Failed", {
        description: error instanceof Error ? error.message : "Failed to update profile",
        duration: 5000,
      })
    } finally {
      setIsLoadingProfile(false)
    }
  }

  async function onPasswordSubmit(values: z.infer<typeof passwordFormSchema>) {
    try {
      setIsLoadingPassword(true)

      const { error: passwordError } = await supabase.auth.updateUser({
        password: values.newPassword
      })

      if (passwordError) throw passwordError
      
      toast.success("Password Updated", {
        description: "Your password has been changed successfully!",
        duration: 3000,
      })

      // Reset password fields after successful update
      passwordForm.reset()
    } catch (error) {
      console.error(error)
      toast.error("Password Update Failed", {
        description: error instanceof Error ? error.message : "Failed to update password",
        duration: 5000,
      })
    } finally {
      setIsLoadingPassword(false)
    }
  }

  const currentSubscription = (user?.subscription || 'free') as SubscriptionType
  const subscriptionBadgeColor = subscriptionStyles[currentSubscription]
  const subscriptionAccentColor = subscriptionColors[currentSubscription]
  const SubscriptionIcon = subscriptionIcons[currentSubscription]

  if (!user) return null

  return (
    <SidebarProvider>
      <AppSidebar className="hidden lg:block" />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <div className="flex items-center gap-2">
              <User className="h-5 w-5" />
              <h1 className="text-xl font-semibold">Account</h1>
            </div>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Profile Card */}
            <Card className="overflow-hidden">
              <CardHeader className="border-b pb-8">
                <div className="space-y-2">
                  <CardTitle className="text-2xl">Profile Settings</CardTitle>
                  <div className="flex flex-col">
                    <CardDescription className="text-base">
                      Update your profile information
                    </CardDescription>
                    <div className="h-1 w-[140px] mt-2 rounded-full bg-green-500/80" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <Form {...profileForm}>
                  <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-8">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-24 h-24">
                        <FileInput
                          onFileSelect={(file) => setAvatarFile(file)}
                          previewUrl={user.avatar_url}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Click to upload a new profile picture
                      </p>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        <div>
                          <h3 className="font-medium">Basic Information</h3>
                          <div className="h-0.5 w-[120px] mt-2 rounded-full bg-green-500/80" />
                        </div>
                      </div>
                      <div className="grid gap-4">
                        <FormField
                          control={profileForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  disabled
                                  type="email"
                                  autoComplete="email"
                                  className="bg-muted"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={profileForm.control}
                          name="nickname"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nickname</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  autoComplete="username"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <div className="pt-4">
                      <Button type="submit" className="w-full" disabled={isLoadingProfile}>
                        {isLoadingProfile ? "Saving changes..." : "Save profile changes"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Security Card */}
            <Card className="overflow-hidden">
              <CardHeader className="border-b pb-8">
                <div className="space-y-2">
                  <CardTitle className="text-2xl">Security Settings</CardTitle>
                  <div className="flex flex-col">
                    <CardDescription className="text-base">
                      Update your password
                    </CardDescription>
                    <div className="h-1 w-[150px] mt-2 rounded-full bg-green-500/80" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <Form {...passwordForm}>
                  <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-8">
                    <div className="space-y-6">
                      <div className="flex items-center gap-2">
                        <KeyRound className="h-5 w-5" />
                        <div>
                          <h3 className="font-medium">Change Password</h3>
                          <div className="h-0.5 w-[130px] mt-2 rounded-full bg-green-500/80" />
                        </div>
                      </div>
                      <div className="grid gap-4">
                        <FormField
                          control={passwordForm.control}
                          name="currentPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Current Password</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="password"
                                  autoComplete="current-password"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={passwordForm.control}
                          name="newPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>New Password</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="password"
                                  autoComplete="new-password"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={passwordForm.control}
                          name="confirmNewPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Confirm New Password</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="password"
                                  autoComplete="new-password"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <div className="pt-4">
                      <Button type="submit" className="w-full" disabled={isLoadingPassword}>
                        {isLoadingPassword ? "Changing password..." : "Change password"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
} 