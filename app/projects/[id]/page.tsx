"use client"

import * as React from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { 
  Plus, 
  FolderKanban, 
  CalendarDays, 
  Tag, 
  Paperclip, 
  Clock,
  CheckCircle2,
  Circle,
  ArrowLeft,
  MoreVertical,
  Calendar as CalendarIcon,
  Pencil,
  Trash2,
  X,
  ExternalLink,
  Download,
  FileText,
  Table,
  File
} from "lucide-react"
import { ChevronDown } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useRouter, useParams } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import Link from "next/link"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

type ProjectStatus = 'todo' | 'in-progress' | 'done'

type Project = {
  id: string
  title: string
  description: string
  status: "todo" | "in-progress" | "done"
  due_date: string
  priority: "low" | "medium" | "high"
  tags: string[]
  attachments: Array<{
    url: string
    name: string
    type: string
    size: number
    path: string
  }>
  color: string
  created_at: string
}

type Task = {
  id: string
  title: string
  description: string | null
  due_date: string | null
  status: ProjectStatus
  project_id: string
  created_by: string
  created_at: string
  updated_at: string
}

const taskFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  due_date: z.date().optional(),
})

type TaskFormValues = z.infer<typeof taskFormSchema>

export default function ProjectDetailsPage() {
  const params = useParams()
  const projectId = params.id as string
  const [project, setProject] = React.useState<Project | null>(null)
  const [tasks, setTasks] = React.useState<Task[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isCreatingTask, setIsCreatingTask] = React.useState(false)
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [editingTask, setEditingTask] = React.useState<Task | null>(null)
  const supabase = createClient()
  const router = useRouter()
  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: "",
      description: "",
      due_date: undefined,
    },
  })

  React.useEffect(() => {
    async function fetchProjectAndTasks() {
      if (!projectId) {
        console.error('No project ID provided')
        toast.error("Missing project ID")
        router.push('/projects')
        return
      }

      try {
        // Get current user first
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError) {
          throw userError
        }
        if (!user) {
          throw new Error("User not found")
        }

        // Fetch project details
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .eq('created_by', user.id)
          .single()

        if (projectError) {
          throw projectError
        }
        if (!projectData) {
          throw new Error("Project not found")
        }

        setProject(projectData)

        // Fetch tasks
        const { data: tasksData, error: tasksError } = await supabase
          .from('tasks')
          .select('*')
          .eq('project_id', projectId)
          .eq('created_by', user.id)
          .order('created_at', { ascending: false })

        if (tasksError) {
          throw tasksError
        }

        setTasks(tasksData || [])
      } catch (error) {
        if (error instanceof Error) {
          toast.error(error.message)
        } else {
          toast.error("Failed to load project details")
        }
        router.push('/projects')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProjectAndTasks()
  }, [projectId, supabase, router])

  const handleCreateTask = async (values: TaskFormValues) => {
    if (!values.title.trim()) {
      toast.error("Task title is required")
      return
    }

    try {
      setIsCreatingTask(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("User not found")

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          title: values.title,
          description: values.description,
          due_date: values.due_date?.toISOString() || null,
          status: 'todo',
          project_id: projectId,
          created_by: user.id
        })
        .select()
        .single()

      if (error) throw error

      setTasks(prev => [data, ...prev])
      form.reset()
      setIsDialogOpen(false)
      toast.success("Task created successfully")
    } catch (error) {
      console.error('Error creating task:', error)
      toast.error("Failed to create task")
    } finally {
      setIsCreatingTask(false)
    }
  }

  const handleEditTask = async (values: TaskFormValues) => {
    if (!editingTask) return;

    try {
      setIsCreatingTask(true);
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("User not found")

      const updatedTask = {
        title: values.title,
        description: values.description || null,
        due_date: values.due_date?.toISOString() || null,
        updated_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('tasks')
        .update(updatedTask)
        .eq('id', editingTask.id)
        .eq('created_by', user.id)
        .select()
        .single()

      if (error) throw error

      setTasks(prev => prev.map(task => 
        task.id === editingTask.id ? { ...task, ...updatedTask } : task
      ))
      
      form.reset()
      setIsDialogOpen(false)
      setEditingTask(null)
      toast.success("Task updated successfully")
    } catch (error) {
      console.error('Error updating task:', error)
      toast.error("Failed to update task")
    } finally {
      setIsCreatingTask(false)
    }
  }

  // Update the dialog title and form when editing
  React.useEffect(() => {
    if (editingTask) {
      form.reset({
        title: editingTask.title,
        description: editingTask.description || "",
        due_date: editingTask.due_date ? new Date(editingTask.due_date) : undefined,
      })
    } else {
      form.reset({
        title: "",
        description: "",
        due_date: undefined,
      })
    }
  }, [editingTask, form])

  const toggleTaskStatus = async (taskId: string, currentStatus: Project['status']) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("User not found")

      // Cycle through statuses: todo -> in-progress -> done -> todo
      const newStatus: Project['status'] = (() => {
        switch (currentStatus) {
          case 'todo':
            return 'in-progress'
          case 'in-progress':
            return 'done'
          case 'done':
          default:
            return 'todo'
        }
      })()

      // Update task using the stored procedure
      const { error: updateError } = await supabase
        .rpc('update_task_status', {
          p_task_id: taskId,
          p_user_id: user.id,
          p_status: newStatus
        })

      if (updateError) throw updateError

      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, status: newStatus } : task
      ))

      const statusDisplay = newStatus === 'in-progress' ? 'in progress' : newStatus
      toast.success(`Task marked as ${statusDisplay}`)
    } catch (error) {
      console.error('Error updating task status:', error)
      toast.error("Failed to update task status")
    }
  }

  const deleteTask = async (taskId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("User not found")

      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)
        .eq('created_by', user.id)

      if (error) throw error

      setTasks(prev => prev.filter(task => task.id !== taskId))
      toast.success("Task deleted successfully")
    } catch (error) {
      console.error('Error deleting task:', error)
      toast.error("Failed to delete task")
    }
  }

  const deleteAttachment = async (attachmentPath: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("User not found")

      // Delete the file from storage
      const { error: storageError } = await supabase
        .storage
        .from('attachments')
        .remove([attachmentPath])

      if (storageError) throw storageError

      // Update the project's attachments array
      const updatedAttachments = project?.attachments.filter(a => a.path !== attachmentPath) || []
      
      const { error: updateError } = await supabase
        .from('projects')
        .update({ attachments: updatedAttachments })
        .eq('id', project?.id)
        .eq('created_by', user.id)

      if (updateError) throw updateError

      // Update local state
      setProject(prev => prev ? {
        ...prev,
        attachments: updatedAttachments
      } : null)

      toast.success("Attachment deleted successfully")
    } catch (error) {
      console.error('Error deleting attachment:', error)
      toast.error("Failed to delete attachment")
    }
  }

  // Add this function after the deleteAttachment function
  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(downloadUrl)
    } catch (error) {
      toast.error("Failed to download file")
    }
  }

  // Add this sorting function before the return statement
  const sortedTasks = React.useMemo(() => {
    return [...tasks].sort((a, b) => {
      // First sort by status (done tasks go to bottom)
      if (a.status === 'done' && b.status !== 'done') return 1;
      if (a.status !== 'done' && b.status === 'done') return -1;
      
      // Then sort by due date for non-done tasks
      if (a.status !== 'done' && b.status !== 'done') {
        // If both tasks have due dates, compare them
        if (a.due_date && b.due_date) {
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
        }
        // If only a has a due date, it comes first
        if (a.due_date) return -1
        // If only b has a due date, it comes first
        if (b.due_date) return 1
      }
      
      // If both are done or no due dates, sort by created date
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [tasks])

  if (isLoading || !project) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-lg">Loading...</div>
      </div>
    )
  }

  const getStatusColor = (status: Project['status']) => {
    switch (status) {
      case 'todo':
        return 'bg-gray-100 text-gray-700'
      case 'in-progress':
        return 'bg-blue-100 text-blue-700'
      case 'done':
        return 'bg-green-100 text-green-700'
    }
  }

  const getPriorityColor = (priority: Project['priority']) => {
    switch (priority) {
      case 'low':
        return 'bg-green-100 text-green-700'
      case 'medium':
        return 'bg-yellow-100 text-yellow-700'
      case 'high':
        return 'bg-red-100 text-red-700'
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar className="hidden lg:block" />
      <SidebarInset className="bg-gradient-to-br from-slate-50 to-white">
        {/* Modern Header with Glassmorphism */}
        <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-white/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/60">
          <div className="flex w-full items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="group flex items-center gap-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                Back to Projects
              </Button>
            </div>
          </div>
        </header>

        <main className="min-h-screen py-8 px-4">
          <div className="mx-auto max-w-6xl space-y-8">
            {/* Project Overview Card */}
            <div className="relative overflow-hidden rounded-2xl border bg-white shadow-sm transition-all hover:shadow-md">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-transparent" />
              <div className="relative p-6 sm:p-8">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100/50">
                        <FolderKanban className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{project.title}</h1>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/projects/new?edit=${project.id}`)}
                            className="rounded-lg hover:bg-blue-50 text-blue-600"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="max-w-2xl text-sm text-slate-600">{project.description}</p>
                      </div>
                    </div>
                  </div>
                  {project.attachments && project.attachments.length > 0 && (
                    <div className="relative lg:w-80">
                      <Collapsible>
                        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border bg-white p-3 text-left hover:bg-slate-50">
                          <div className="flex items-center gap-2">
                            <Paperclip className="h-4 w-4 text-blue-500" />
                            <span className="text-sm font-medium">
                              Attachments ({project.attachments.length})
                            </span>
                          </div>
                          <ChevronDown className="h-4 w-4 text-slate-400 transition-transform duration-200 ease-in-out group-data-[state=open]:rotate-180" />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-2">
                          <div className="space-y-2">
                            {project.attachments.map((attachment, index) => (
                              <div
                                key={index}
                                className="group relative overflow-hidden rounded-lg border bg-white p-3 shadow-sm transition-all hover:border-blue-200 hover:shadow-md"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                                    {attachment.type?.startsWith('image/') ? (
                                      <img
                                        src={attachment.url}
                                        alt={attachment.name}
                                        className="h-10 w-10 rounded-lg object-cover"
                                      />
                                    ) : attachment.type?.includes('pdf') ? (
                                      <FileText className="h-5 w-5" />
                                    ) : attachment.type?.includes('excel') || attachment.type?.includes('sheet') ? (
                                      <Table className="h-5 w-5" />
                                    ) : attachment.type?.includes('word') || attachment.type?.includes('document') ? (
                                      <FileText className="h-5 w-5" />
                                    ) : (
                                      <File className="h-5 w-5" />
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-slate-900">
                                      {attachment.name}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                      {(attachment.size / 1024 / 1024).toFixed(2)} MB
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-1">
                                      {/* Open Button */}
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => window.open(attachment.url, '_blank')}
                                        className="h-8 w-8 rounded-lg text-slate-600 hover:bg-blue-50 hover:text-blue-600"
                                        title="Open file"
                                      >
                                        <ExternalLink className="h-4 w-4" />
                                      </Button>
                                      {/* Download Button */}
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => handleDownload(attachment.url, attachment.name)}
                                        className="h-8 w-8 rounded-lg text-slate-600 hover:bg-blue-50 hover:text-blue-600"
                                        title="Download file"
                                      >
                                        <Download className="h-4 w-4" />
                                      </Button>
                                      {/* Delete Button */}
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => {
                                          if (window.confirm('Are you sure you want to delete this attachment?')) {
                                            deleteAttachment(attachment.path)
                                          }
                                        }}
                                        className="h-8 w-8 rounded-lg text-slate-600 hover:bg-red-50 hover:text-red-600"
                                        title="Delete file"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Project Stats Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Status Card */}
              <div className="group relative overflow-hidden rounded-xl border bg-white p-6 shadow-sm transition-all hover:shadow-md">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-50/50 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="relative space-y-2">
                  <p className="text-sm font-medium text-slate-600">Status</p>
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "h-3 w-3 rounded-full",
                      project.status === 'todo' && "bg-slate-400",
                      project.status === 'in-progress' && "bg-blue-500",
                      project.status === 'done' && "bg-green-500"
                    )} />
                    <span className="font-medium capitalize text-slate-900">
                      {project.status.replace('-', ' ')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Priority Card */}
              <div className="group relative overflow-hidden rounded-xl border bg-white p-6 shadow-sm transition-all hover:shadow-md">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-50/50 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="relative space-y-2">
                  <p className="text-sm font-medium text-slate-600">Priority</p>
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "h-3 w-3 rounded-full",
                      project.priority === 'low' && "bg-green-500",
                      project.priority === 'medium' && "bg-yellow-500",
                      project.priority === 'high' && "bg-red-500"
                    )} />
                    <span className="font-medium capitalize text-slate-900">
                      {project.priority}
                    </span>
                  </div>
                </div>
              </div>

              {/* Due Date Card */}
              <div className="group relative overflow-hidden rounded-xl border bg-white p-6 shadow-sm transition-all hover:shadow-md">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-50/50 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="relative space-y-2">
                  <p className="text-sm font-medium text-slate-600">Due Date</p>
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-slate-400" />
                    <span className="font-medium text-slate-900">
                      {format(new Date(project.due_date), 'MMM d, yyyy')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tags Card */}
              <div className="group relative overflow-hidden rounded-xl border bg-white p-6 shadow-sm transition-all hover:shadow-md">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-50/50 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="relative space-y-2">
                  <p className="text-sm font-medium text-slate-600">Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {project.tags.map((tag, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Tasks Section */}
            <div className="space-y-6 rounded-2xl border bg-white p-6 shadow-sm lg:p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100/50">
                    <CheckCircle2 className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Tasks</h2>
                    <p className="text-sm text-slate-600">Manage and track your project tasks</p>
                  </div>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                  setIsDialogOpen(open)
                  if (!open) setEditingTask(null)
                }}>
                  <DialogTrigger asChild>
                    <Button 
                      onClick={() => setIsDialogOpen(true)}
                      className="group flex items-center gap-2 bg-blue-600 text-white shadow-lg transition-all hover:bg-blue-700 hover:shadow-xl"
                    >
                      <Plus className="h-4 w-4 transition-transform group-hover:scale-110" />
                      Add Task
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>{editingTask ? 'Edit Task' : 'Create New Task'}</DialogTitle>
                      <DialogDescription>
                        {editingTask 
                          ? 'Update your task details below.'
                          : 'Break down your project into manageable tasks to track progress effectively.'
                        }
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(editingTask ? handleEditTask : handleCreateTask)} className="space-y-4 py-4">
                        <FormField
                          control={form.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">Task Title</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter task title"
                                  className="h-12 text-base shadow-sm transition-shadow focus:shadow-md"
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
                              <FormLabel className="text-sm font-medium">Description</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Enter task description"
                                  className="min-h-[120px] resize-none text-base shadow-sm transition-shadow focus:shadow-md"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="due_date"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel className="text-sm font-medium">Due Date</FormLabel>
                              <div className="relative">
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <FormControl>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        className={cn(
                                          "w-full h-12 pl-3 text-left font-normal text-base shadow-sm transition-all hover:border-blue-200 hover:shadow-md focus:border-blue-400",
                                          !field.value && "text-slate-500"
                                        )}
                                      >
                                        {field.value ? (
                                          format(field.value, "PPP")
                                        ) : (
                                          <span>Select a due date</span>
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
                                        date < new Date(new Date().setHours(0, 0, 0, 0))
                                      }
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <DialogFooter>
                          <Button
                            type="submit"
                            disabled={isCreatingTask}
                            className="w-full bg-blue-600 text-white shadow-lg transition-all hover:bg-blue-700 hover:shadow-xl disabled:opacity-50"
                          >
                            {isCreatingTask ? (
                              <div className="flex items-center gap-2">
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                {editingTask ? 'Updating...' : 'Creating...'}
                              </div>
                            ) : (
                              editingTask ? 'Update Task' : 'Create Task'
                            )}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="space-y-4">
                {sortedTasks.length === 0 && (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-white/50 py-12 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100/50 text-blue-600">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <h3 className="mt-4 text-sm font-medium text-slate-900">No tasks yet</h3>
                    <p className="mt-2 max-w-sm text-sm text-slate-600">
                      Create your first task to start tracking progress on this project
                    </p>
                  </div>
                )}

                {sortedTasks.map((task) => (
                  <div
                    key={task.id}
                    className={cn(
                      "group relative overflow-hidden rounded-xl border bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-blue-100",
                      task.due_date && new Date() > new Date(task.due_date) && task.status !== 'done' && "bg-red-50/50 border-red-100",
                      task.status === 'done' && !task.due_date && "bg-slate-50/50",
                      task.status === 'in-progress' && !task.due_date && "bg-blue-50/50"
                    )}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-50/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                    
                    {/* Action Buttons */}
                    <div className="absolute right-4 top-4 flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setEditingTask(task)
                          setIsDialogOpen(true)
                        }}
                        className="h-8 w-8 rounded-lg bg-white/90 shadow-sm backdrop-blur-sm transition-all hover:bg-blue-50 hover:shadow-md"
                      >
                        <Pencil className="h-4 w-4 text-blue-600" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          if (window.confirm('Are you sure you want to delete this task?')) {
                            deleteTask(task.id)
                          }
                        }}
                        className="h-8 w-8 rounded-lg bg-white/90 shadow-sm backdrop-blur-sm transition-all hover:bg-red-50 hover:shadow-md"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>

                    <div className="relative flex items-start gap-4">
                      <button
                        onClick={() => toggleTaskStatus(task.id, task.status)}
                        className="mt-1 flex-shrink-0 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 rounded-full"
                        aria-label={`Mark task as ${task.status === 'done' ? 'incomplete' : 'complete'}`}
                      >
                        {task.status === 'done' ? (
                          <CheckCircle2 className="h-5 w-5 text-blue-600" />
                        ) : task.status === 'in-progress' ? (
                          <Circle className="h-5 w-5 text-blue-500" />
                        ) : (
                          <Circle className="h-5 w-5 text-slate-400 hover:text-blue-500" />
                        )}
                      </button>
                      <div className="flex-grow min-w-0">
                        <h3 className={cn(
                          "text-base font-medium text-slate-900 truncate transition-colors",
                          task.status === 'done' && "line-through text-slate-500"
                        )}>
                          {task.title}
                        </h3>
                        {task.description && (
                          <p className={cn(
                            "mt-1 text-sm text-slate-600 line-clamp-2 transition-colors",
                            task.status === 'done' && "line-through text-slate-400"
                          )}>
                            {task.description}
                          </p>
                        )}
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {task.due_date && (
                            <div className="flex items-center gap-1.5 rounded-md bg-white/90 px-2 py-1 text-xs text-slate-600 shadow-sm backdrop-blur-sm ring-1 ring-slate-200/50">
                              <CalendarDays className="h-3.5 w-3.5" />
                              Due {format(new Date(task.due_date), 'MMM d, yyyy')}
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 rounded-md bg-white/90 px-2 py-1 text-xs text-slate-600 shadow-sm backdrop-blur-sm ring-1 ring-slate-200/50">
                            <Clock className="h-3.5 w-3.5" />
                            {format(new Date(task.created_at), 'MMM d, yyyy')}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className={cn(
                              "px-2 py-1 text-xs rounded-md shadow-sm backdrop-blur-sm",
                              task.status === 'done' && "bg-blue-100 text-blue-700 ring-1 ring-blue-200/50",
                              task.status === 'in-progress' && "bg-blue-100 text-blue-700 ring-1 ring-blue-200/50",
                              task.status === 'todo' && "bg-slate-100 text-slate-700 ring-1 ring-slate-200/50"
                            )}>
                              {task.status === 'in-progress' ? 'In Progress' : 
                               task.status === 'done' ? 'Completed' : 'To Do'}
                            </Badge>
                            {task.due_date && new Date() > new Date(task.due_date) && task.status !== 'done' && (
                              <Badge variant="secondary" className="px-2 py-1 text-xs rounded-md shadow-sm backdrop-blur-sm bg-red-100 text-red-700 ring-1 ring-red-200/50">
                                Overdue
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
} 