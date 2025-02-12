"use client"

import { Suspense } from "react"
import { LoginForm } from "@/components/login-form"

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]">
          <div className="h-8 w-8 rounded-full border-2 border-t-blue-500 animate-spin" />
        </div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
