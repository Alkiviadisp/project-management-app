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
import { Calendar as CalendarIcon, Loader2, ArrowLeft, X, Upload, FolderKanban } from "lucide-react"
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
  status: z.enum(["todo", "in-progress", "done"]),
  dueDate: z.date({
    required_error: "Due date is required",
  }),
  priority: z.enum(["low", "medium", "high"]),
  tags: z.string().array(),
  attachments: z.any().array().optional(),
})

type ProjectFormValues = z.infer<typeof projectFormSchema>

const defaultValues: Partial<ProjectFormValues> = {
  title: "",
  description: "",
  owner: "",
  status: "todo",
  priority: "medium",
  tags: [],
  attachments: [],
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

      // Get current user first
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) {
        console.error('User error:', userError)
        throw userError
      }
      if (!user) throw new Error("User not found")

      // Handle file uploads
      const uploadedFiles = []
      if (files.length > 0) {
        for (const file of files) {
          try {
            // Validate file size
            if (file.size > 10 * 1024 * 1024) {
              throw new Error(`File ${file.name} is too large. Maximum size is 10MB`)
            }

            // Validate file type
            if (!file.type.match(/^image\/(jpeg|png|gif|webp)$/)) {
              throw new Error(`File ${file.name} is not a supported image type`)
            }

            // Create a unique file name
            const timestamp = new Date().getTime()
            const randomString = Math.random().toString(36).substring(2, 15)
            const cleanFileName = file.name.toLowerCase().replace(/[^a-z0-9.-]/g, '-')
            const fileName = `${timestamp}-${randomString}-${cleanFileName}`
            const filePath = `${user.id}/${fileName}`

            console.log('Starting file upload:', {
              name: file.name,
              type: file.type,
              size: file.size,
              path: filePath
            })

            // Upload the file
            const { error: uploadError, data: uploadData } = await supabase.storage
              .from('project-attachments')
              .upload(filePath, file, {
                cacheControl: '3600',
                contentType: file.type,
                upsert: false
              })

            if (uploadError) {
              console.error('Upload error details:', uploadError)
              throw new Error(`Failed to upload file ${file.name}: ${uploadError.message || 'Unknown error'}`)
            }

            if (!uploadData) {
              throw new Error(`No upload data returned for ${file.name}`)
            }

            console.log('Upload successful:', uploadData)

            // Get the public URL
            const { data: { publicUrl } } = supabase.storage
              .from('project-attachments')
              .getPublicUrl(filePath)

            if (!publicUrl) {
              throw new Error(`Failed to get public URL for ${file.name}`)
            }

            uploadedFiles.push({
              url: publicUrl,
              name: file.name,
              type: file.type,
              size: file.size,
              path: filePath
            })

            console.log('File processed successfully:', {
              name: file.name,
              url: publicUrl
            })
          } catch (fileError) {
            console.error('File processing error:', {
              file: file.name,
              error: fileError
            })
            toast.error(`Failed to upload ${file.name}`, {
              description: fileError instanceof Error ? fileError.message : "Upload failed"
            })
            // Continue with other files
            continue
          }
        }
      }

      // If we have files but none were uploaded successfully, stop here
      if (files.length > 0 && uploadedFiles.length === 0) {
        throw new Error("No files were uploaded successfully")
      }

      // Generate a random color for the project
      const colors = [
        'bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 
        'bg-teal-500', 'bg-green-500', 'bg-yellow-500', 'bg-orange-500',
        'bg-red-500', 'bg-cyan-500'
      ]
      const randomColor = colors[Math.floor(Math.random() * colors.length)]

      console.log('Creating project with data:', {
        title: data.title,
        attachments: uploadedFiles,
        color: randomColor
      })

      // Create project in database
      const { error: insertError } = await supabase
        .from('projects')
        .insert({
          title: data.title,
          description: data.description,
          created_by: user.id,
          status: data.status,
          due_date: data.dueDate.toISOString(),
          priority: data.priority,
          tags: data.tags || [],
          attachments: uploadedFiles,
          color: randomColor
        })

      if (insertError) {
        console.error('Project creation error:', insertError)
        throw new Error(`Failed to create project: ${insertError.message}`)
      }

      toast.success("Project Created", {
        description: "Your project has been created successfully.",
      })

      router.push("/projects")
    } catch (error) {
      console.error('Submission error:', error)
      toast.error("Failed to create project", {
        description: error instanceof Error ? error.message : "Something went wrong. Please try again.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar className="hidden lg:block" />
      <SidebarInset className="bg-gradient-to-br from-white to-blue-50/20">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
          <div className="flex w-full items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                  <CalendarIcon className="h-5 w-5 text-blue-600" />
                </div>
                <h1 className="text-xl font-semibold">New Project</h1>
              </div>
            </div>
          </div>
        </header>
        <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-start py-10 px-4">
          <div className="w-full max-w-6xl">
            <div className="mb-12">
              <div className="flex items-center gap-4 mb-8">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.back()}
                  className="rounded-lg hover:bg-blue-50"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Projects
                </Button>
                <Separator orientation="vertical" className="h-4" />
                <div className="text-sm text-muted-foreground">Fill in the project details below</div>
              </div>
              <h1 className="text-4xl font-bold tracking-tight">
                Create New Project
              </h1>
              <p className="mt-4 text-muted-foreground text-lg max-w-2xl">
                Start by filling in the essential information about your project. You can always update these details later.
              </p>
            </div>

            <div className="space-y-8">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                  <div className="space-y-8 rounded-xl border bg-white p-8 shadow-sm">
                    <div className="flex items-center gap-3 pb-6 border-b">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                          <FolderKanban className="h-5 w-5 text-blue-600" />
                        </div>
                        <h2 className="text-xl font-semibold">Project Information</h2>
                      </div>
                      <div className="ml-auto">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex items-center gap-2 border-blue-200 hover:bg-blue-50 transition-colors"
                            >
                              <Upload className="h-4 w-4 text-blue-500" />
                              <span className="text-sm text-blue-600">Add Attachments</span>
                              {files.length > 0 && (
                                <Badge 
                                  variant="secondary" 
                                  className="ml-1 bg-blue-100 text-blue-600"
                                >
                                  {files.length}
                                </Badge>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-96 p-4" align="end">
                            <div className="space-y-4">
                              <div 
                                className="relative group flex flex-col items-center justify-center h-32 rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/30 px-4 py-4 text-center transition-all hover:border-blue-400 hover:bg-blue-50/50"
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  const droppedFiles = Array.from(e.dataTransfer.files).filter(
                                    file => file.type.startsWith('image/')
                                  );
                                  setFiles(prev => [...prev, ...droppedFiles]);
                                }}
                              >
                                <div className="flex flex-col items-center gap-2">
                                  <Upload className="h-8 w-8 text-blue-500 group-hover:text-blue-600 transition-colors" />
                                  <div className="flex flex-col items-center gap-1">
                                    <span className="text-sm font-medium text-blue-600">Drop images here or click to upload</span>
                                    <span className="text-xs text-blue-400">Supports: JPG, PNG, GIF (Max 10MB)</span>
                                  </div>
                                </div>
                                <Input 
                                  type="file"
                                  accept="image/*"
                                  className="absolute inset-0 cursor-pointer opacity-0"
                                  onChange={(e) => {
                                    if (e.target.files) {
                                      const newFiles = Array.from(e.target.files).filter(
                                        file => file.type.startsWith('image/') && file.size <= 10 * 1024 * 1024
                                      );
                                      setFiles(prev => [...prev, ...newFiles]);
                                    }
                                  }}
                                  multiple
                                />
                              </div>
                              {files.length > 0 && (
                                <div className="grid grid-cols-2 gap-2">
                                  {files.map((file, index) => (
                                    <div 
                                      key={index}
                                      className="group relative aspect-square rounded-lg border bg-white shadow-sm overflow-hidden"
                                    >
                                      <img
                                        src={URL.createObjectURL(file)}
                                        alt={file.name}
                                        className="h-full w-full object-cover"
                                      />
                                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                          type="button"
                                          variant="destructive"
                                          size="icon"
                                          className="h-6 w-6"
                                          onClick={() => {
                                            URL.revokeObjectURL(URL.createObjectURL(file));
                                            setFiles(prev => prev.filter((_, i) => i !== index));
                                          }}
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      </div>
                                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-1">
                                        <p className="text-xs text-white truncate">{file.name}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                      {/* Left Column */}
                      <div className="space-y-8">
                        <FormField
                          control={form.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-base font-semibold">Project Title</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Enter project title" 
                                  className="h-12 text-base transition-colors hover:border-blue-200 focus:border-blue-400"
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
                              <FormLabel className="text-base font-semibold">Project Owner</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Enter project owner" 
                                  className="h-12 text-base transition-colors hover:border-blue-200 focus:border-blue-400"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid gap-8 md:grid-cols-2">
                          <FormField
                            control={form.control}
                            name="status"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-base font-semibold">Status</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="h-12 text-base transition-colors hover:border-blue-200 focus:border-blue-400">
                                      <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="todo">To Do</SelectItem>
                                    <SelectItem value="in-progress">In Progress</SelectItem>
                                    <SelectItem value="done">Done</SelectItem>
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
                                <FormLabel className="text-base font-semibold">Priority</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="h-12 text-base transition-colors hover:border-blue-200 focus:border-blue-400">
                                      <SelectValue placeholder="Set priority" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="low">
                                      <div className="flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full bg-green-500" />
                                        Low
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="medium">
                                      <div className="flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full bg-yellow-500" />
                                        Medium
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="high">
                                      <div className="flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full bg-red-500" />
                                        High
                                      </div>
                                    </SelectItem>
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
                              <FormLabel className="text-base font-semibold">Due Date</FormLabel>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant={"outline"}
                                      className={cn(
                                        "w-full h-12 pl-3 text-left font-normal text-base transition-colors hover:border-blue-200 focus:border-blue-400",
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

                      {/* Right Column */}
                      <div className="space-y-8">
                        <FormField
                          control={form.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-base font-semibold">Description</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Enter project description"
                                  className="min-h-[180px] resize-none text-base transition-colors hover:border-blue-200 focus:border-blue-400"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="tags"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-base font-semibold">Tags</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Add tags (comma separated)"
                                  className="h-12 text-base bg-white transition-colors hover:border-blue-200 focus:border-blue-400"
                                  value={tagsInput}
                                  onChange={(e) => {
                                    setTagsInput(e.target.value)
                                    const values = e.target.value.split(',').map(v => v.trim()).filter(Boolean)
                                    field.onChange(values)
                                  }}
                                />
                              </FormControl>
                              <FormDescription className="text-sm">
                                Enter tags separated by commas (e.g. frontend, design, urgent)
                              </FormDescription>
                              <FormMessage />
                              {field.value.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {field.value.map((tag, index) => (
                                    <Badge 
                                      key={index} 
                                      variant="secondary"
                                      className="px-3 py-1 text-sm bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                                    >
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="sticky bottom-0 flex items-center justify-between gap-4 border-t bg-white/80 backdrop-blur-sm p-4 sm:px-6">
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      onClick={() => router.back()}
                      disabled={isLoading}
                      className="text-base border-blue-200 hover:bg-blue-50 transition-colors"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      size="lg"
                      disabled={isLoading}
                      className="min-w-[200px] text-base bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:hover:shadow-lg"
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