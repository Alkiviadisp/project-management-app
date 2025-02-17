"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { FileInput } from "@/components/ui/file-input"
import { toast } from "sonner"
import Link from "next/link"
import { useRouter } from "next/navigation"

const formSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  nickname: z.string().min(3, "Nickname must be at least 3 characters"),
})

export function SignUpForm() {
  const [isLoading, setIsLoading] = React.useState(false)
  const [avatarFile, setAvatarFile] = React.useState<File | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      nickname: "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsLoading(true)

      let avatarUrl = null
      let uploadedFileName = null

      // Upload avatar if selected
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop()
        // Create a more structured file path
        uploadedFileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
        
        // Upload the avatar
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(uploadedFileName, avatarFile, {
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

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(uploadedFileName)

        avatarUrl = publicUrl
      }

      // Sign up with Supabase Auth
      const { data, error: authError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            nickname: values.nickname,
            avatar_url: avatarUrl,
          },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      })

      if (authError) {
        // If sign up fails, clean up the uploaded avatar
        if (uploadedFileName) {
          try {
            await supabase.storage
              .from('avatars')
              .remove([uploadedFileName])
              .catch(error => {
                console.error('Failed to clean up avatar after failed sign-up:', error)
              })
          } catch (error) {
            console.error('Error while cleaning up avatar:', error)
          }
        }

        if (authError.message.includes('email')) {
          toast.error("Email Already Registered", {
            description: "This email is already registered. Please use a different email or try logging in.",
            duration: 5000,
          })
        } else if (authError.message.includes('password')) {
          toast.error("Invalid Password", {
            description: "Please check the password requirements and try again.",
            duration: 5000,
          })
        } else {
          toast.error("Account Creation Failed", {
            description: authError.message || "Failed to create account. Please try again.",
            duration: 5000,
          })
        }
        throw authError
      }

      if (data?.user) {
        toast.success("Account Created!", {
          description: "Please check your email (including spam folder) to verify your account before logging in.",
          duration: 8000, // Longer duration for important message
          important: true, // Makes the toast persist
        })
        // Add a slight delay before redirect to ensure the user sees the message
        await new Promise(resolve => setTimeout(resolve, 1000))
        router.push("/login")
      } else {
        toast.error("Account Creation Failed", {
          description: "Something unexpected happened. Please try again.",
          duration: 5000,
        })
      }
    } catch (error) {
      console.error(error)
      // Only show generic error if we haven't shown a specific one
      if (error instanceof Error && !toast.message) {
        toast.error("Error", {
          description: error.message || "Something went wrong. Please try again.",
          duration: 5000,
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="border-none shadow-none">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Create an account</CardTitle>
        <CardDescription>
          Enter your information below to create your account
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            <div className="flex justify-center">
              <FileInput
                onFileSelect={(file) => setAvatarFile(file)}
              />
            </div>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="you@example.com" 
                      type="email"
                      autoComplete="email"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="nickname"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nickname</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="johndoe"
                      autoComplete="username"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Creating account..." : "Create account"}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter>
        <div className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </div>
      </CardFooter>
    </Card>
  )
} 