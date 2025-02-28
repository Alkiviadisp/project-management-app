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
  File,
  RotateCcw
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core"
import { restrictToWindowEdges } from "@dnd-kit/modifiers"

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
  status: z.enum(["todo", "in-progress", "done"]),
})

type TaskFormValues = z.infer<typeof taskFormSchema>

// Add getStatusColor function
function getStatusColor(status: ProjectStatus) {
  switch (status) {
    case 'todo':
      return 'bg-gray-100 text-gray-800'
    case 'in-progress':
      return 'bg-green-100 text-green-800'
    case 'done':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

// Add DroppableColumn component
function DroppableColumn({ id, title, children, className }: { 
  id: string; 
  title: string; 
  children: React.ReactNode;
  className?: string;
}) {
  const { setNodeRef } = useDroppable({ id })
  const isMainColumn = id === 'todo' || id === 'in-progress'

  return (
    <div className="h-full w-full">
      {title && <h2 className="text-lg font-semibold mb-4">{title}</h2>}
      <div 
        ref={setNodeRef} 
        className={cn(
          "relative",
          isMainColumn && "p-6 rounded-lg border-2 border-dashed transition-colors min-h-[400px] h-fit w-full",
          isMainColumn && id === "todo" && "bg-gray-50/50 border-gray-200",
          isMainColumn && id === "in-progress" && "bg-green-50/50 border-green-200",
          className
        )}
      >
        {isMainColumn ? (
          <div className="space-y-4 pb-20">
            {children}
          </div>
        ) : children}
      </div>
    </div>
  )
}

// Add TaskCard component
function TaskCard({ 
  task, 
  isDragging,
  onEdit,
  onTaskClick
}: { 
  task: Task; 
  isDragging?: boolean;
  onEdit: (task: Task) => void;
  onTaskClick: (task: Task) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging: isBeingDragged } = useDraggable({
    id: task.id,
    data: task,
  })

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    opacity: isBeingDragged ? 0 : 1
  } : undefined

  const handleClick = (e: React.MouseEvent) => {
    if (!isDragging) {
      onTaskClick(task)
    }
  }

  const isOverdue = task.due_date && new Date() > new Date(task.due_date) && task.status !== 'done'

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={handleClick}
      className={cn(
        "group relative rounded-lg border bg-white p-4 shadow-sm transition-all hover:shadow-md touch-none",
        isDragging && "shadow-lg cursor-grabbing",
        !isDragging && "cursor-pointer hover:border-blue-200",
        isOverdue && "bg-red-50/50 border-red-200",
        task.status === 'in-progress' && "bg-blue-50/50",
        task.status === 'done' && "bg-slate-50/50"
      )}
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">{task.title}</h3>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity hover:text-blue-700 hover:bg-blue-50"
              onClick={(e) => {
                e.stopPropagation()
                onEdit(task)
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Badge variant="secondary" className={cn("px-1.5 py-0 text-xs", getStatusColor(task.status))}>
              {task.status.replace('-', ' ')}
            </Badge>
          </div>
        </div>
        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {task.description}
          </p>
        )}
        <div className="flex items-center gap-4">
          {task.due_date && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarDays className="h-3 w-3" />
              <span className={cn(
                isOverdue && "text-red-600 font-medium"
              )}>
                Due {format(new Date(task.due_date), 'MMM d, yyyy')}
                {isOverdue && " (Overdue)"}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ProjectDetailsPage() {
  const params = useParams()
  const projectId = params.id as string
  const [project, setProject] = React.useState<Project | null>(null)
  const [tasks, setTasks] = React.useState<Task[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isCreatingTask, setIsCreatingTask] = React.useState(false)
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [editingTask, setEditingTask] = React.useState<Task | null>(null)
  const [isCompletedTasksOpen, setIsCompletedTasksOpen] = React.useState(false)
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false)
  const [activeTask, setActiveTask] = React.useState<Task | null>(null)
  const supabase = createClient()
  const router = useRouter()
  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: "",
      description: "",
      due_date: undefined,
      status: "todo",
    },
  })
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

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

      // Format the date without timezone conversion
      const formattedDate = values.due_date ? 
        `${values.due_date.getFullYear()}-${String(values.due_date.getMonth() + 1).padStart(2, '0')}-${String(values.due_date.getDate()).padStart(2, '0')}` : 
        null;

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          title: values.title,
          description: values.description,
          due_date: formattedDate,
          status: values.status,
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

      // Update task using raw SQL to ensure proper enum handling
      const { error: updateError } = await supabase
        .rpc('update_task_status', {
          p_task_id: editingTask.id,
          p_user_id: user.id,
          p_status: values.status
        })

      if (updateError) throw updateError

      // Update other fields
      const { data, error } = await supabase
        .from('tasks')
        .update({
          title: values.title,
          description: values.description || null,
          due_date: values.due_date ? values.due_date.toISOString().split('T')[0] : null,
          updated_at: new Date().toISOString().split('T')[0]
        })
        .eq('id', editingTask.id)
        .eq('created_by', user.id)
        .select()
        .single()

      if (error) throw error

      setTasks(prev => prev.map(task => 
        task.id === editingTask.id ? { 
          ...task, 
          title: values.title,
          description: values.description || null,
          due_date: values.due_date ? values.due_date.toISOString().split('T')[0] : null,
          status: values.status,
          updated_at: new Date().toISOString().split('T')[0]
        } : task
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
        status: editingTask.status,
      })
    } else {
      form.reset({
        title: "",
        description: "",
        due_date: undefined,
        status: "todo",
      })
    }
  }, [editingTask, form])

  const toggleTaskStatus = async (taskId: string, currentStatus: Project['status']) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("User not found")

      // Simply toggle between done and not done
      const newStatus: Project['status'] = currentStatus === 'done' ? 'todo' : 'done';

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

      toast.success(`Task marked as ${newStatus === 'done' ? 'completed' : 'to do'}`)
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

  // Sort tasks to separate completed ones
  const activeTasks = React.useMemo(() => {
    return sortedTasks.filter(task => task.status !== 'done')
  }, [sortedTasks])

  const completedTasks = React.useMemo(() => {
    return sortedTasks.filter(task => task.status === 'done')
  }, [sortedTasks])

  // Add handleDragEnd function
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    
    if (!over) return

    const taskId = active.id as string
    const newStatus = over.id as "todo" | "in-progress" | "done"
    const task = tasks.find(t => t.id === taskId)
    
    if (!task || task.status === newStatus) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("User not found")

      // Update task using raw SQL to ensure proper enum handling
      const { error: updateError } = await supabase
        .rpc('update_task_status', {
          p_task_id: taskId,
          p_user_id: user.id,
          p_status: newStatus
        })

      if (updateError) throw updateError

      setTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, status: newStatus } : t
      ))

      toast.success(`Task moved to ${newStatus.replace('-', ' ')}`)
    } catch (error) {
      console.error('Error updating task:', error)
      toast.error("Failed to update task status")
    }

    setActiveTask(null)
  }

  const handleDragStart = (event: DragStartEvent) => {
    const taskId = event.active.id as string
    const task = tasks.find(t => t.id === taskId)
    if (task) setActiveTask(task)
  }

  if (isLoading || !project) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-lg">Loading...</div>
      </div>
    )
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
      <SidebarInset className="bg-gradient-to-br from-white to-blue-50/20">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
          <div className="flex w-full items-center justify-between px-4 md:px-6">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <Button
                variant="ghost"
                size="icon"
                asChild
                className="mr-2 h-8 w-8 hover:bg-gray-100"
              >
                <Link href="/projects">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                  <FolderKanban className="h-5 w-5 text-blue-600" />
                </div>
                <h1 className="text-xl font-semibold">Project Details</h1>
              </div>
            </div>
          </div>
        </header>

        <main className="min-h-screen py-6 px-4 md:px-6">
          <div className="w-full space-y-6">
            {/* Project Overview Card */}
            <div className="relative overflow-hidden rounded-2xl border bg-white shadow-sm transition-all hover:shadow-md">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-transparent" />
              <div className="relative p-6">
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
                        <p className="text-sm text-slate-600">{project.description}</p>
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
                        <CollapsibleContent className="absolute mt-2 w-80 rounded-lg border bg-white p-2 shadow-lg">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <DndContext
              sensors={sensors}
              onDragEnd={handleDragEnd}
              onDragStart={handleDragStart}
              modifiers={[restrictToWindowEdges]}
            >
              <div className="space-y-6 rounded-2xl border bg-white p-6 shadow-sm">
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
                                        initialFocus
                                        fromDate={new Date()}
                                        disabled={(date) => {
                                          const today = new Date()
                                          today.setHours(0, 0, 0, 0)
                                          return date < today
                                        }}
                                        className="rounded-md border [&_.rdp]:p-2 [&_.rdp-months]:space-y-4 [&_.rdp-table]:w-full [&_.rdp-head_th]:w-10 [&_.rdp-head_th]:p-0 [&_.rdp-head_th]:font-normal [&_.rdp-head_th]:text-sm [&_.rdp-cell]:p-0 [&_.rdp-tbody]:space-y-2 [&_.rdp-day]:h-10 [&_.rdp-day]:w-10 [&_.rdp-day]:p-0 [&_.rdp-day_button]:h-10 [&_.rdp-day_button]:w-10"
                                      />
                                    </PopoverContent>
                                  </Popover>
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="status"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium">Status</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="h-12 text-base shadow-sm transition-shadow focus:shadow-md">
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
                  {activeTasks.length === 0 && completedTasks.length === 0 && (
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

                  {/* Done Drop Zone */}
                  <DroppableColumn 
                    id="done" 
                    title=""
                    className="mt-4 h-16 border-2 border-dashed border-red-200 bg-red-50/50 rounded-lg flex items-center justify-center"
                  >
                    <div className="flex items-center gap-2 text-red-500">
                      <CheckCircle2 className="h-5 w-5" />
                      <p className="text-sm">Drop here to mark as done</p>
                    </div>
                  </DroppableColumn>

                  {/* Completed Tasks Section - Moved here */}
                  {completedTasks.length > 0 && (
                    <div className="mt-4">
                      <Collapsible>
                        <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium hover:bg-gray-50 transition-colors rounded-lg border">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-red-600" />
                            <span>Completed Tasks</span>
                            <Badge variant="secondary" className="ml-2 bg-red-100 text-red-600">
                              {completedTasks.length}
                            </Badge>
                          </div>
                          <ChevronDown className="h-4 w-4 text-gray-500" />
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="divide-y border-t mt-2">
                            {completedTasks.map((task) => (
                              <div
                                key={task.id}
                                className="group flex items-center gap-3 bg-red-50/50 px-4 py-3"
                              >
                                <button
                                  onClick={() => toggleTaskStatus(task.id, task.status)}
                                  className="flex-shrink-0 transition-transform hover:scale-110"
                                >
                                  <CheckCircle2 className="h-4 w-4 text-red-600" />
                                </button>
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium text-gray-900">{task.title}</p>
                                  <div className="flex items-center gap-3 text-xs text-gray-500">
                                    {task.due_date && (
                                      <span className="flex items-center gap-1">
                                        <CalendarDays className="h-3 w-3" />
                                        Due {format(new Date(task.due_date), 'MMM d')}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={async () => {
                                      try {
                                        const { data: { user } } = await supabase.auth.getUser()
                                        if (!user) throw new Error("User not found")

                                        const { error: updateError } = await supabase
                                          .rpc('update_task_status', {
                                            p_task_id: task.id,
                                            p_user_id: user.id,
                                            p_status: 'in-progress'
                                          })

                                        if (updateError) throw updateError

                                        setTasks(prev => prev.map(t => 
                                          t.id === task.id ? { ...t, status: 'in-progress' } : t
                                        ))

                                        toast.success("Task moved back to in progress")
                                      } catch (error) {
                                        console.error('Error updating task:', error)
                                        toast.error("Failed to update task status")
                                      }
                                    }}
                                    className="flex-shrink-0 transition-transform hover:scale-110"
                                    title="Return to In Progress"
                                  >
                                    <RotateCcw className="h-4 w-4 text-green-600 hover:text-green-700" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      if (window.confirm('Are you sure you want to delete this task?')) {
                                        deleteTask(task.id)
                                      }
                                    }}
                                    className="flex-shrink-0"
                                  >
                                    <Trash2 className="h-4 w-4 text-red-600 hover:text-red-700" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  )}

                  <div className="space-y-4">
                    {/* Active Tasks */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* To Do Column */}
                      <DroppableColumn id="todo" title="To Do">
                        {activeTasks
                          .filter(task => task.status === 'todo')
                          .map((task) => (
                            <TaskCard 
                              key={task.id} 
                              task={task} 
                              onEdit={(task) => {
                                setEditingTask(task)
                                setIsDialogOpen(true)
                              }}
                              onTaskClick={(task) => {
                                setSelectedTask(task)
                                setIsDetailsOpen(true)
                              }}
                            />
                          ))}
                      </DroppableColumn>

                      {/* In Progress Column */}
                      <DroppableColumn id="in-progress" title="In Progress">
                        {activeTasks
                          .filter(task => task.status === 'in-progress')
                          .map((task) => (
                            <TaskCard 
                              key={task.id} 
                              task={task} 
                              onEdit={(task) => {
                                setEditingTask(task)
                                setIsDialogOpen(true)
                              }}
                              onTaskClick={(task) => {
                                setSelectedTask(task)
                                setIsDetailsOpen(true)
                              }}
                            />
                          ))}
                      </DroppableColumn>
                    </div>
                  </div>
                </div>
              </div>

              <DragOverlay>
                {activeTask ? (
                  <TaskCard 
                    task={activeTask} 
                    isDragging 
                    onEdit={(task) => {
                      setEditingTask(task)
                      setIsDialogOpen(true)
                    }}
                    onTaskClick={(task) => {
                      setSelectedTask(task)
                      setIsDetailsOpen(true)
                    }}
                  />
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
        </main>
      </SidebarInset>

      {/* Task Details Dialog */}
      <Dialog 
        open={isDetailsOpen} 
        onOpenChange={setIsDetailsOpen}
      >
        <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden">
          {selectedTask && (
            <div className="flex flex-col h-full">
              <DialogHeader className="p-6 pb-4 border-b space-y-4">
                <div className="flex items-center justify-between">
                  <Badge 
                    variant="secondary" 
                    className={cn(
                      "px-2.5 py-0.5 text-xs font-semibold",
                      getStatusColor(selectedTask.status)
                    )}
                  >
                    {selectedTask.status.replace('-', ' ')}
                  </Badge>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <DialogTitle className="text-xl font-semibold tracking-tight">{selectedTask.title}</DialogTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 flex-shrink-0"
                    onClick={() => {
                      setIsDetailsOpen(false)
                      setEditingTask(selectedTask)
                      setIsDialogOpen(true)
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
                <DialogDescription className="text-sm text-gray-500">
                  View and manage task details, status, and timeline.
                </DialogDescription>
              </DialogHeader>

              {/* Task Details */}
              <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                {/* Description */}
                {selectedTask.description && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-gray-600">Description</h3>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {selectedTask.description}
                    </p>
                  </div>
                )}

                {/* Dates & Timeline */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-gray-600">Due Date</h3>
                    <div className="flex items-center gap-2 text-sm">
                      <CalendarDays className="h-4 w-4 text-gray-500" />
                      <span>{selectedTask.due_date ? format(new Date(selectedTask.due_date), 'MMM d, yyyy') : 'No due date'}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-gray-600">Created</h3>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span>{format(new Date(selectedTask.created_at), 'MMM d, yyyy')}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="p-6 pt-4 border-t bg-gray-50/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTaskStatus(selectedTask.id, selectedTask.status)
                      }}
                      className="flex items-center gap-2"
                    >
                      {selectedTask.status === 'done' ? (
                        <>
                          <RotateCcw className="h-4 w-4" />
                          <span>Reopen Task</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Mark as Done</span>
                        </>
                      )}
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm('Are you sure you want to delete this task?')) {
                        deleteTask(selectedTask.id)
                        setIsDetailsOpen(false)
                      }
                    }}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Task
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  )
} 