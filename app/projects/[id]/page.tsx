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
  MoreVertical
} from "lucide-react"
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
  status: "pending" | "completed"
  project_id: string
  created_by: string
  created_at: string
  updated_at: string
}

export default function ProjectDetailsPage() {
  const params = useParams()
  const projectId = params.id as string
  const [project, setProject] = React.useState<Project | null>(null)
  const [tasks, setTasks] = React.useState<Task[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isCreatingTask, setIsCreatingTask] = React.useState(false)
  const [newTask, setNewTask] = React.useState({ title: "", description: "" })
  const supabase = createClient()
  const router = useRouter()

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
          console.error('User error:', userError)
          throw userError
        }
        if (!user) {
          console.error('No user found')
          throw new Error("User not found")
        }

        console.log('Fetching project:', projectId)
        // Fetch project details
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .eq('created_by', user.id)
          .single()

        if (projectError) {
          console.error('Project error:', projectError)
          throw projectError
        }
        if (!projectData) {
          console.error('No project found')
          throw new Error("Project not found")
        }

        console.log('Project found:', projectData)
        setProject(projectData)

        // Fetch tasks
        const { data: tasksData, error: tasksError } = await supabase
          .from('tasks')
          .select('*')
          .eq('project_id', projectId)
          .eq('created_by', user.id)
          .order('created_at', { ascending: false })

        if (tasksError) {
          console.error('Tasks error:', tasksError)
          throw tasksError
        }

        console.log('Tasks found:', tasksData?.length || 0)
        setTasks(tasksData || [])
      } catch (error) {
        console.error('Error fetching data:', error)
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

  const handleCreateTask = async () => {
    if (!newTask.title.trim()) {
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
          title: newTask.title,
          description: newTask.description,
          status: 'pending',
          project_id: projectId,
          created_by: user.id
        })
        .select()
        .single()

      if (error) throw error

      setTasks(prev => [data, ...prev])
      setNewTask({ title: "", description: "" })
      toast.success("Task created successfully")
    } catch (error) {
      console.error('Error creating task:', error)
      toast.error("Failed to create task")
    } finally {
      setIsCreatingTask(false)
    }
  }

  const toggleTaskStatus = async (taskId: string, currentStatus: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("User not found")

      const newStatus = currentStatus === 'pending' ? 'completed' : 'pending'
      const { error } = await supabase
        .from('tasks')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId)
        .eq('created_by', user.id)

      if (error) {
        console.error('Error updating task status:', error)
        throw error
      }

      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, status: newStatus } : task
      ))
      toast.success(`Task marked as ${newStatus}`)
    } catch (error) {
      console.error('Error updating task:', error)
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

      if (error) {
        console.error('Error deleting task:', error)
        throw error
      }

      setTasks(prev => prev.filter(task => task.id !== taskId))
      toast.success("Task deleted successfully")
    } catch (error) {
      console.error('Error deleting task:', error)
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error("Failed to delete task")
      }
    }
  }

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
      <SidebarInset className="bg-gradient-to-br from-white to-blue-50/20">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
          <div className="flex w-full items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="rounded-lg hover:bg-blue-50"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Projects
              </Button>
            </div>
          </div>
        </header>

        <main className="flex flex-col items-center justify-start py-8 px-4">
          <div className="w-full max-w-5xl space-y-8">
            {/* Project Header */}
            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="space-y-4">
                  <h1 className="text-2xl font-bold text-gray-900">{project.title}</h1>
                  <p className="text-sm text-muted-foreground max-w-2xl">{project.description}</p>
                  
                  <div className="flex flex-wrap gap-3">
                    <Badge variant="secondary" className={cn("px-2 py-1", getStatusColor(project.status))}>
                      {project.status.replace('-', ' ')}
                    </Badge>
                    <Badge variant="secondary" className={cn("px-2 py-1", getPriorityColor(project.priority))}>
                      {project.priority}
                    </Badge>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <CalendarDays className="h-4 w-4" />
                      <span>Due {format(new Date(project.due_date), 'MMM d, yyyy')}</span>
                    </div>
                  </div>

                  {project.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {project.tags.map((tag, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="bg-blue-50 text-blue-700 hover:bg-blue-100"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {project.attachments?.[0] && (
                  <div className="hidden sm:block">
                    <img
                      src={project.attachments[0].url}
                      alt={project.attachments[0].name}
                      className="h-32 w-32 rounded-lg object-cover"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Tasks Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Tasks</h2>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Task
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Task</DialogTitle>
                      <DialogDescription>
                        Add a new task to this project. Tasks help you break down your project into manageable pieces.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Task Title</label>
                        <Input
                          placeholder="Enter task title"
                          value={newTask.title}
                          onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Description</label>
                        <Textarea
                          placeholder="Enter task description"
                          value={newTask.description}
                          onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        onClick={handleCreateTask}
                        disabled={isCreatingTask}
                        className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white"
                      >
                        {isCreatingTask ? "Creating..." : "Create Task"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="space-y-3">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="group flex items-start gap-3 rounded-lg border bg-white p-4 shadow-sm transition-all hover:shadow-md"
                  >
                    <button
                      onClick={() => toggleTaskStatus(task.id, task.status)}
                      className="mt-1 flex-shrink-0"
                    >
                      {task.status === 'completed' ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <Circle className="h-5 w-5 text-gray-400 hover:text-blue-500" />
                      )}
                    </button>
                    <div className="flex-grow">
                      <h3 className={cn(
                        "text-sm font-medium",
                        task.status === 'completed' && "text-muted-foreground line-through"
                      )}>
                        {task.title}
                      </h3>
                      {task.description && (
                        <p className={cn(
                          "mt-1 text-sm text-muted-foreground",
                          task.status === 'completed' && "line-through"
                        )}>
                          {task.description}
                        </p>
                      )}
                      <div className="mt-2 text-xs text-muted-foreground">
                        Created {format(new Date(task.created_at), 'MMM d, yyyy')}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600"
                          onClick={() => {
                            if (window.confirm('Are you sure you want to delete this task?')) {
                              deleteTask(task.id)
                            }
                          }}
                        >
                          Delete Task
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}

                {tasks.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                      <CheckCircle2 className="h-6 w-6 text-blue-600" />
                    </div>
                    <h3 className="mt-4 text-sm font-medium">No tasks yet</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Create your first task to get started
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
} 