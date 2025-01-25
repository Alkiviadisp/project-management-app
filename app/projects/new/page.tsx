"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Loader2, ArrowLeft, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { FileInput } from "@/components/ui/file-input"
import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

const projectFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  owner: z.string().min(3, "Owner name must be at least 3 characters"),
  status: z.enum(["not_started", "in_progress", "completed"]),
  dueDate: z.date({
    required_error: "Due date is required",
  }),
  priority: z.enum(["low", "medium", "high"]),
  tags: z.string().array(),
  attachments: z.any().array().optional(),
  comments: z.string().optional(),
})

type ProjectFormValues = z.infer<typeof projectFormSchema>

const defaultValues: Partial<ProjectFormValues> = {
  title: "",
  description: "",
  owner: "",
  status: "not_started",
  priority: "medium",
  tags: [],
  attachments: [],
  comments: "",
}

export default function NewProjectPage() {
  const [isLoading, setIsLoading] = React.useState(false)
  const [files, setFiles] = React.useState<File[]>([])
  const [tagsInput, setTagsInput] = React.useState("")
  const router = useRouter()
  const supabase = createClient()

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues,
    mode: "onChange",
  })

  async function onSubmit(data: ProjectFormValues) {
    try {
      setIsLoading(true)

      // Handle file uploads
      const uploadedFiles = []
      if (files.length > 0) {
        for (const file of files) {
          const fileExt = file.name.split('.').pop()
          const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
          
          const { error: uploadError } = await supabase.storage
            .from('project-attachments')
            .upload(fileName, file)

          if (uploadError) throw uploadError

          const { data: { publicUrl } } = supabase.storage
            .from('project-attachments')
            .getPublicUrl(fileName)

          uploadedFiles.push(publicUrl)
        }
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("User not found")

      // Create project in database
      const { error } = await supabase
        .from('projects')
        .insert({
          title: data.title,
          description: data.description,
          owner_id: user.id,
          status: data.status,
          due_date: data.dueDate.toISOString(),
          priority: data.priority,
          tags: data.tags,
          attachments: uploadedFiles,
          comments: data.comments ? [{
            text: data.comments,
            user_id: user.id,
            created_at: new Date().toISOString()
          }] : [],
        })

      if (error) throw error

      toast.success("Project Created", {
        description: "Your project has been created successfully.",
      })

      router.push("/projects")
    } catch (error) {
      console.error(error)
      toast.error("Failed to create project", {
        description: error instanceof Error ? error.message : "Something went wrong",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar className="hidden lg:block" />
      <SidebarInset className="bg-gradient-to-br from-blue-50 via-background to-green-50/20">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
          <div className="flex w-full items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-blue-600" />
                <h1 className="text-xl font-semibold">New Project</h1>
              </div>
            </div>
          </div>
        </header>
        <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-start py-10 px-4">
          <div className="w-full max-w-4xl">
            <div className="mb-12 text-center">
              <Button
                variant="ghost"
                size="sm"
                className="mb-6"
                onClick={() => router.back()}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                Create New Project
              </h1>
              <div className="mt-3 mx-auto h-1 w-24 bg-gradient-to-r from-blue-600 to-green-600 rounded-full" />
              <p className="mt-4 text-muted-foreground text-lg">
                Fill in the details below to create a new project.
              </p>
            </div>

            <div className="space-y-8">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                  <div className="space-y-8 rounded-xl border bg-white/50 backdrop-blur supports-[backdrop-filter]:bg-white/60 p-8 shadow-lg">
                    <div className="flex items-center gap-3 pb-4 border-b border-blue-100">
                      <div className="h-8 w-1 rounded-full bg-gradient-to-b from-blue-600 to-green-600" />
                      <h2 className="text-xl font-semibold">Basic Information</h2>
                    </div>
                    <div className="space-y-6">
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base">Project Title</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter project title" 
                                className="h-12 text-base"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base">Description</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Enter project description"
                                className="min-h-[120px] resize-none text-base"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="owner"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base">Project Owner</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter project owner" 
                                className="h-12 text-base"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="space-y-8 rounded-xl border bg-white/50 backdrop-blur supports-[backdrop-filter]:bg-white/60 p-8 shadow-lg">
                    <div className="flex items-center gap-3 pb-4 border-b border-blue-100">
                      <div className="h-8 w-1 rounded-full bg-gradient-to-b from-blue-600 to-green-600" />
                      <h2 className="text-xl font-semibold">Project Details</h2>
                    </div>
                    <div className="space-y-6">
                      <div className="grid gap-8 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="status"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-base">Status</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger className="h-12 text-base">
                                    <SelectValue placeholder="Select project status" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="not_started">Not Started</SelectItem>
                                  <SelectItem value="in_progress">In Progress</SelectItem>
                                  <SelectItem value="completed">Completed</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="priority"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-base">Priority</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger className="h-12 text-base">
                                    <SelectValue placeholder="Select priority level" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="low">Low</SelectItem>
                                  <SelectItem value="medium">Medium</SelectItem>
                                  <SelectItem value="high">High</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="dueDate"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel className="text-base">Due Date</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant={"outline"}
                                    className={cn(
                                      "w-full h-12 pl-3 text-left font-normal text-base",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    {field.value ? (
                                      format(field.value, "PPP")
                                    ) : (
                                      <span>Pick a date</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-5 w-5 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  disabled={(date) =>
                                    date < new Date() || date < new Date("1900-01-01")
                                  }
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="space-y-8 rounded-xl border bg-white/50 backdrop-blur supports-[backdrop-filter]:bg-white/60 p-8 shadow-lg">
                    <div className="flex items-center gap-3 pb-4 border-b border-blue-100">
                      <div className="h-8 w-1 rounded-full bg-gradient-to-b from-blue-600 to-green-600" />
                      <h2 className="text-xl font-semibold">Additional Information</h2>
                    </div>
                    <div className="space-y-6">
                      <FormField
                        control={form.control}
                        name="tags"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base">Tags</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Add tags (comma separated)"
                                className="h-12 text-base bg-white"
                                value={tagsInput}
                                onChange={(e) => {
                                  setTagsInput(e.target.value)
                                  const values = e.target.value.split(',').map(v => v.trim()).filter(Boolean)
                                  field.onChange(values)
                                }}
                              />
                            </FormControl>
                            <FormDescription>
                              Enter tags separated by commas
                            </FormDescription>
                            <FormMessage />
                            {field.value.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {field.value.map((tag, index) => (
                                  <Badge 
                                    key={index} 
                                    variant="secondary"
                                    className="px-3 py-1 text-sm bg-blue-100 text-blue-700 hover:bg-blue-200"
                                  >
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="attachments"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base">Attachments</FormLabel>
                            <FormControl>
                              <div className="flex flex-col gap-4">
                                <Input 
                                  type="file"
                                  className="h-12 text-base bg-white"
                                  onChange={(e) => {
                                    if (e.target.files?.[0]) {
                                      setFiles(prev => [...prev, e.target.files![0]])
                                    }
                                  }}
                                  multiple
                                />
                                {files.length > 0 && (
                                  <div className="flex flex-wrap gap-2">
                                    {files.map((file, index) => (
                                      <Badge 
                                        key={index} 
                                        variant="secondary"
                                        className="px-3 py-1 text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 cursor-pointer"
                                        onClick={() => setFiles(prev => prev.filter((_, i) => i !== index))}
                                      >
                                        {file.name}
                                        <X className="ml-2 h-3 w-3" />
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </FormControl>
                            <FormDescription>
                              Upload project files (documents, images, etc.)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="comments"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base">Initial Comment</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Add an initial comment or note"
                                className="min-h-[120px] resize-none text-base bg-white"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 justify-end pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      onClick={() => router.back()}
                      disabled={isLoading}
                      className="text-base border-blue-200 hover:bg-blue-50"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      size="lg"
                      disabled={isLoading}
                      className="text-base bg-gradient-to-r from-blue-600 to-green-600 text-white hover:opacity-90"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Creating Project...
                        </>
                      ) : (
                        "Create Project"
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
} 