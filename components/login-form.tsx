"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
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
import { toast } from "sonner"
import Link from "next/link"

const formSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

export function LoginForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = React.useState(false)
  const supabase = createClient()

  // Add error event listener to window to prevent unhandled errors
  React.useEffect(() => {
    const handler = (event: ErrorEvent) => {
      if (event.message.includes('fetch failed') || 
          (event.error?.stack && event.error.stack.includes('supabase.co/auth/v1/token'))) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener('error', handler);
    window.addEventListener('unhandledrejection', (event) => {
      if (event.reason?.stack?.includes('supabase.co/auth/v1/token')) {
        event.preventDefault();
      }
    });

    return () => {
      window.removeEventListener('error', handler);
      window.removeEventListener('unhandledrejection', handler as any);
    };
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      })

      if (error) {
        // Handle specific error cases
        switch (error.message) {
          case 'Invalid login credentials':
            toast.error('Invalid credentials', {
              description: 'Please check your email and password.',
              duration: 3000,
            })
            break
          case 'Email not confirmed':
            toast.error('Email not verified', {
              description: 'Please check your email for the verification link.',
              duration: 5000,
            })
            break
          default:
            toast.error('Login Failed', {
              description: 'An unexpected error occurred. Please try again.',
              duration: 3000,
            })
        }
        return
      }

      if (!data?.user) {
        toast.error('Login Failed', {
          description: 'Please try again later.',
          duration: 3000,
        })
        return
      }

      toast.success('Welcome back!', {
        description: 'You have successfully logged in.',
        duration: 3000,
      })
      
      router.push('/dashboard')
    } catch (error) {
      // Handle unexpected errors
      console.error('Login error:', error)
      toast.error('Login Failed', {
        description: 'An unexpected error occurred. Please try again later.',
        duration: 3000,
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="border-none shadow-none">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Sign in</CardTitle>
        <CardDescription>
          Enter your email and password to sign in to your account
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="m@example.com" {...field} />
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
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
        <div className="text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link href="/signup" className="text-primary hover:underline">
            Sign up
          </Link>
        </div>
        <div className="text-sm text-muted-foreground">
          <Link href="/forgot-password" className="text-primary hover:underline">
            Forgot your password?
          </Link>
        </div>
      </CardFooter>
    </Card>
  )
}
