"use client"

import * as React from "react"
import { Suspense } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { useRouter, useSearchParams } from "next/navigation"
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
import { Calendar as CalendarIcon, Loader2, ArrowLeft, X, Upload, FolderKanban, FileText, Table, File, ChevronDown } from "lucide-react"
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
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible"

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

// Update the type definition
type StoredFile = {
  url: string;
  name: string;
  type: string;
  size: number;
  path: string;
}

function ProjectForm() {
  const [isLoading, setIsLoading] = React.useState(false)
  const [files, setFiles] = React.useState<File[]>([])
  const [existingAttachments, setExistingAttachments] = React.useState<StoredFile[]>([])
  const [tagsInput, setTagsInput] = React.useState("")
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const editId = searchParams.get('edit')
  const [isEditing, setIsEditing] = React.useState(false)
  const [userNickname, setUserNickname] = React.useState("")

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues,
    mode: "onChange",
  })

  React.useEffect(() => {
    async function fetchUserNickname() {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError) throw userError
        if (!user) throw new Error("User not found")

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('nickname')
          .eq('id', user.id)
          .single()

        if (profileError) throw profileError
        if (!profile) throw new Error("Profile not found")

        setUserNickname(profile.nickname || user.email?.split('@')[0] || 'Anonymous')
        
        if (!editId) {
          form.setValue('owner', profile.nickname || user.email?.split('@')[0] || 'Anonymous')
        }
      } catch (error) {
        // Silent error handling for security
        toast.error("Failed to fetch user information")
      }
    }

    fetchUserNickname()
  }, [form, editId])

  React.useEffect(() => {
    async function fetchProject() {
      if (!editId) return

      try {
        setIsLoading(true)
        const { data, error } = await supabase
          .from('projects')
          .select(`
            *,
            profiles:created_by (
              nickname
            )
          `)
          .eq('id', editId)
          .single()

        if (error) throw error
        if (!data) throw new Error('Project not found')

        const ownerNickname = data.profiles?.nickname || data.owner || ''
        setUserNickname(ownerNickname)

        form.reset({
          title: data.title,
          description: data.description,
          owner: ownerNickname,
          status: data.status,
          dueDate: new Date(data.due_date),
          priority: data.priority,
          tags: data.tags || [],
          attachments: data.attachments || [],
        })

        // Set existing files if there are any attachments
        if (data.attachments?.length > 0) {
          setFiles([])  // Reset files since we're in edit mode
          setExistingAttachments(data.attachments)
        }

        setTagsInput(data.tags?.join(', ') || '')
        setIsEditing(true)
      } catch (error) {
        toast.error('Failed to fetch project')
        router.push('/projects')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProject()
  }, [editId, form, router, supabase])

  async function onSubmit(data: ProjectFormValues) {
    try {
      setIsLoading(true)

      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError
      if (!user) throw new Error("User not found")

      // Handle regular attachments upload
      const uploadedFiles = []
      if (files.length > 0) {
        for (const file of files) {
          try {
            if (file.size > 10 * 1024 * 1024) {
              throw new Error(`File ${file.name} is too large. Maximum size is 10MB`)
            }

            const timestamp = new Date().getTime()
            const randomString = Math.random().toString(36).substring(2, 15)
            const cleanFileName = file.name.toLowerCase().replace(/[^a-z0-9.-]/g, '-')
            const fileName = `${timestamp}-${randomString}-${cleanFileName}`
            const filePath = `files/${user.id}/${fileName}`

            const { error: uploadError, data: uploadData } = await supabase.storage
              .from('project-attachments')
              .upload(filePath, file, {
                cacheControl: '3600',
                contentType: 'application/octet-stream',
                upsert: false
              })

            if (uploadError) {
              throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`)
            }

            const { data: { publicUrl } } = supabase.storage
              .from('project-attachments')
              .getPublicUrl(filePath)

            const fileData = {
              url: publicUrl,
              name: file.name,
              type: file.type,
              size: file.size,
              path: filePath
            }
            
            uploadedFiles.push(fileData)
          } catch (fileError) {
            toast.error(`Failed to upload ${file.name}`, {
              description: fileError instanceof Error ? fileError.message : "Upload failed"
            })
            continue
          }
        }
      }

      let finalAttachments = uploadedFiles
      if (isEditing) {
        const existingAttachments = data.attachments || []
        finalAttachments = [...existingAttachments, ...uploadedFiles]
      }

      const colors = [
        'bg-[#FFB5A7]', // Pastel Red
        'bg-[#FCD5CE]', // Pastel Pink
        'bg-[#F8EDEB]', // Pastel Rose
        'bg-[#F9DCC4]', // Pastel Orange
        'bg-[#FEC89A]', // Pastel Peach
        'bg-[#D8E2DC]', // Pastel Sage
        'bg-[#BCE1E6]', // Pastel Blue
        'bg-[#A2D2FF]', // Pastel Sky
        'bg-[#CDB4DB]', // Pastel Purple
        'bg-[#FFF1E6]', // Pastel Cream
      ]
      const randomColor = colors[Math.floor(Math.random() * colors.length)]

      const projectData = {
        title: data.title,
        description: data.description,
        created_by: user.id,
        status: data.status,
        due_date: data.dueDate.toISOString(),
        priority: data.priority,
        tags: data.tags || [],
        attachments: finalAttachments,
        color: isEditing ? undefined : randomColor
      }

      let error
      if (isEditing) {
        const updateData = Object.fromEntries(
          Object.entries(projectData)
            .filter(([key, value]) => 
              value !== undefined && 
              !['created_by'].includes(key)
            )
        )
        
        const { error: updateError } = await supabase
          .from('projects')
          .update(updateData)
          .eq('id', editId)
        error = updateError
      } else {
        const { error: insertError } = await supabase
          .from('projects')
          .insert(projectData)
        error = insertError
      }

      if (error) throw error

      toast.success(isEditing ? "Project Updated" : "Project Created", {
        description: isEditing 
          ? "Your project has been updated successfully."
          : "Your project has been created successfully.",
      })

      router.push("/projects")
    } catch (error) {
      console.error('Submission error:', error)
      toast.error(isEditing ? "Failed to update project" : "Failed to create project", {
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
                {isEditing ? 'Edit Project' : 'Create New Project'}
              </h1>
              <p className="mt-4 text-muted-foreground text-lg max-w-2xl">
                {isEditing 
                  ? 'Update your project information below. All fields can be modified.'
                  : 'Start by filling in the essential information about your project. You can always update these details later.'}
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
                      <div className="ml-auto flex items-center gap-4">
                        {/* Attachments Dropdown */}
                        <Collapsible>
                          <CollapsibleTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="flex items-center gap-2 border-blue-200 hover:bg-blue-50"
                            >
                              <Upload className="h-4 w-4 text-blue-500" />
                              <span className="text-sm text-blue-600">Attachments</span>
                              {(files.length > 0 || existingAttachments.length > 0) && (
                                <Badge variant="secondary" className="ml-1 bg-blue-100 text-blue-600">
                                  {files.length + existingAttachments.length}
                                </Badge>
                              )}
                              <ChevronDown className="h-4 w-4 text-slate-400 transition-transform duration-200 ease-in-out group-data-[state=open]:rotate-180" />
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="absolute mt-2 w-80 rounded-lg border bg-white p-2 shadow-lg">
                            <FormField
                              control={form.control}
                              name="attachments"
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <div className="flex flex-col gap-2">
                                      <label htmlFor="attachments" className="group relative">
                                        <Input
                                          id="attachments"
                                          type="file"
                                          multiple
                                          className="hidden"
                                          onChange={(e) => {
                                            if (e.target.files) {
                                              const supportedExtensions = [
                                                '.jpg', '.jpeg', '.png', '.gif', '.webp',
                                                '.pdf', '.txt', '.doc', '.docx',
                                                '.xls', '.xlsx', '.ppt', '.pptx',
                                                '.odt', '.ods', '.odp',
                                                '.csv', '.json', '.zip'
                                              ]

                                              const newFiles = Array.from(e.target.files).filter(file => {
                                                if (file.size > 10 * 1024 * 1024) {
                                                  toast.error(`${file.name} is too large. Maximum size is 10MB.`)
                                                  return false
                                                }
                                                const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
                                                if (!supportedExtensions.includes(fileExtension)) {
                                                  toast.error(`${file.name} type is not supported. Supported types are: images, PDF, Office documents, text files, and archives.`)
                                                  return false
                                                }
                                                return true
                                              })

                                              if (newFiles.length > 0) {
                                                setFiles(prev => [...prev, ...newFiles])
                                              }
                                            }
                                            e.target.value = ''
                                          }}
                                        />
                                        <Button
                                          type="button"
                                          variant="outline"
                                          className="w-full justify-center gap-2"
                                          onClick={() => document.getElementById('attachments')?.click()}
                                        >
                                          <Upload className="h-4 w-4" />
                                          Choose Files
                                        </Button>
                                      </label>

                                      {/* Show existing attachments */}
                                      {isEditing && existingAttachments.length > 0 && (
                                        <div className="space-y-2">
                                          <div className="px-2 py-1 text-xs font-medium text-slate-500">
                                            Existing Attachments
                                          </div>
                                          {existingAttachments.map((file, index) => (
                                            <div key={index} className="flex items-center gap-2 rounded-lg border bg-white p-2">
                                              <div className="flex h-10 w-10 items-center justify-center rounded bg-slate-100">
                                                {file.type?.startsWith('image/') ? (
                                                  <img
                                                    src={file.url}
                                                    alt={file.name}
                                                    className="h-10 w-10 rounded object-cover"
                                                  />
                                                ) : (
                                                  <div className="flex h-full w-full items-center justify-center rounded bg-slate-100 text-slate-500">
                                                    {file.type?.includes('pdf') ? (
                                                      <FileText className="h-5 w-5" />
                                                    ) : file.type?.includes('excel') || file.type?.includes('sheet') ? (
                                                      <Table className="h-5 w-5" />
                                                    ) : file.type?.includes('word') || file.type?.includes('document') ? (
                                                      <FileText className="h-5 w-5" />
                                                    ) : (
                                                      <File className="h-5 w-5" />
                                                    )}
                                                  </div>
                                                )}
                                              </div>
                                              <div className="flex flex-col min-w-0">
                                                <span className="text-sm font-medium text-slate-900 truncate">
                                                  {file.name}
                                                </span>
                                                <span className="text-xs text-slate-500">
                                                  {(file.size / 1024 / 1024).toFixed(2)} MB
                                                </span>
                                              </div>
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-red-600 hover:bg-red-50"
                                                onClick={() => {
                                                  setExistingAttachments(prev => prev.filter((_, i) => i !== index))
                                                  form.setValue('attachments', existingAttachments.filter((_, i) => i !== index))
                                                }}
                                              >
                                                <X className="h-4 w-4" />
                                              </Button>
                                            </div>
                                          ))}
                                        </div>
                                      )}

                                      {/* Show new files being added */}
                                      {files.length > 0 && (
                                        <div className="space-y-2">
                                          {!isEditing && (
                                            <div className="px-2 py-1 text-xs font-medium text-slate-500">
                                              New Attachments
                                            </div>
                                          )}
                                          {files.map((file, index) => (
                                            <div key={index} className="flex items-center gap-2 rounded-lg border bg-white p-2">
                                              <div className="flex h-10 w-10 items-center justify-center rounded bg-slate-100">
                                                {file.type.startsWith('image/') ? (
                                                  <img
                                                    src={URL.createObjectURL(file)}
                                                    alt={file.name}
                                                    className="h-10 w-10 rounded object-cover"
                                                  />
                                                ) : (
                                                  <div className="flex h-full w-full items-center justify-center rounded bg-slate-100 text-slate-500">
                                                    {file.type.includes('pdf') ? (
                                                      <FileText className="h-5 w-5" />
                                                    ) : file.type.includes('excel') || file.type.includes('sheet') ? (
                                                      <Table className="h-5 w-5" />
                                                    ) : file.type.includes('word') || file.type.includes('document') ? (
                                                      <FileText className="h-5 w-5" />
                                                    ) : (
                                                      <File className="h-5 w-5" />
                                                    )}
                                                  </div>
                                                )}
                                              </div>
                                              <div className="flex flex-col min-w-0">
                                                <span className="text-sm font-medium text-slate-900 truncate">
                                                  {file.name}
                                                </span>
                                                <span className="text-xs text-slate-500">
                                                  {(file.size / 1024 / 1024).toFixed(2)} MB
                                                </span>
                                              </div>
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-red-600 hover:bg-red-50"
                                                onClick={() => {
                                                  if (file.type.startsWith('image/')) {
                                                    URL.revokeObjectURL(URL.createObjectURL(file))
                                                  }
                                                  setFiles(prev => prev.filter((_, i) => i !== index))
                                                }}
                                              >
                                                <X className="h-4 w-4" />
                                              </Button>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </CollapsibleContent>
                        </Collapsible>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
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
                                  {...field}
                                  disabled={true}
                                  readOnly={true}
                                  className="h-12 text-base bg-gray-50 transition-colors cursor-not-allowed"
                                />
                              </FormControl>
                              <FormDescription className="text-sm text-muted-foreground">
                                Project owner is automatically set and cannot be changed
                              </FormDescription>
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
                                <Select onValueChange={field.onChange} value={field.value}>
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
                          {isEditing ? 'Updating Project...' : 'Creating Project...'}
                        </>
                      ) : (
                        isEditing ? 'Update Project' : 'Create Project'
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

export default function NewProjectPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProjectForm />
    </Suspense>
  )
} 