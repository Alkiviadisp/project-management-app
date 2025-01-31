"use client"

import * as React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  ListTodo, 
  Clock, 
  CalendarDays, 
  CheckCircle2, 
  Circle,
  Search,
  FolderKanban,
  Pencil,
  Trash2,
  Plus
} from "lucide-react"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { createClient } from "@/lib/supabase/client"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import Link from "next/link"

type ProjectStatus = 'todo' | 'in-progress' | 'done'

type TaskFromDB = {
  id: string
  title: string
  description: string | null
  status: ProjectStatus
  due_date: string | null
  project_id: string
  created_by: string
  created_at: string
  updated_at: string
}

type ProjectFromDB = {
  id: string
  title: string
  color: string
}

type Task = {
  id: string
  title: string
  description: string | null
  status: ProjectStatus
  due_date: string | null
  project_id: string
  created_by: string
  created_at: string
  updated_at: string
  project: {
    id: string
    title: string
    color: string
  }
}

export default function TasksPage() {
  const [tasks, setTasks] = React.useState<Task[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState("")
  const supabase = createClient()

  React.useEffect(() => {
    async function fetchTasks() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("User not found")

        const { data, error } = await supabase
          .from('tasks')
          .select(`
            id,
            title,
            description,
            status,
            due_date,
            project_id,
            created_by,
            created_at,
            updated_at
          `)
          .eq('created_by', user.id)
          .order('created_at', { ascending: false })
          .returns<TaskFromDB[]>()

        if (error) throw error

        // Fetch projects for the tasks
        const projectIds = [...new Set(data?.map(task => task.project_id) || [])]
        
        if (projectIds.length > 0) {
          const { data: projectsData, error: projectsError } = await supabase
            .from('projects')
            .select('id, title, color')
            .in('id', projectIds)
            .returns<ProjectFromDB[]>()

          if (projectsError) throw projectsError

          // Map projects to tasks
          const tasksWithProjects = data.map(task => ({
            ...task,
            project: projectsData.find(p => p.id === task.project_id) || {
              id: task.project_id,
              title: 'Unknown Project',
              color: 'bg-gray-500'
            }
          })) as Task[]

          setTasks(tasksWithProjects)
        } else {
          // If there are no tasks, set empty array
          setTasks([])
        }
      } catch (error) {
        console.error('Error fetching tasks:', error)
        toast.error("Failed to load tasks")
      } finally {
        setIsLoading(false)
      }
    }

    fetchTasks()
  }, [])

  const filteredTasks = React.useMemo(() => {
    return tasks
      .filter(task => task.status !== 'done') // Filter out completed tasks
      .filter(task => 
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.project.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
  }, [tasks, searchQuery])

  const toggleTaskStatus = async (taskId: string, currentStatus: ProjectStatus) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("User not found")

      // Cycle through statuses: todo -> in-progress -> done -> todo
      const newStatus: ProjectStatus = (() => {
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

      // Update task using raw SQL to ensure proper enum handling
      const { error: updateError } = await supabase
        .rpc('update_task_status', {
          p_task_id: taskId,
          p_user_id: user.id,
          p_status: newStatus
        })

      if (updateError) {
        console.error('Update error:', updateError)
        throw updateError
      }

      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, status: newStatus } : task
      ))

      const statusDisplay = newStatus === 'in-progress' ? 'in progress' : newStatus
      toast.success(`Task marked as ${statusDisplay}`)
    } catch (error) {
      console.error('Error updating task:', error)
      toast.error("Failed to update task status")
    }
  }

  const deleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)

      if (error) throw error

      setTasks(prev => prev.filter(task => task.id !== taskId))
      toast.success("Task deleted successfully")
    } catch (error) {
      console.error('Error deleting task:', error)
      toast.error("Failed to delete task")
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar className="hidden lg:block" />
      <SidebarInset className="bg-gradient-to-br from-white to-blue-50/20">
        <header className="flex h-16 shrink-0 items-center justify-between border-b bg-white/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-white/60">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mx-4 h-6" />
            <div className="flex items-center gap-2">
              <ListTodo className="h-5 w-5" />
              <h1 className="text-xl font-semibold">Tasks</h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative w-64">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search Tasks by Project Title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </header>

        <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-start py-10 px-4">
          <div className="w-full max-w-5xl space-y-6">
            {isLoading ? (
              <div className="grid gap-4">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="h-32 rounded-xl border bg-white/50 animate-pulse"
                  />
                ))}
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                  <ListTodo className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">No tasks found</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {searchQuery ? "Try adjusting your search query" : "Create your first task to get started"}
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredTasks.map((task) => (
                  <div
                    key={task.id}
                    className={cn(
                      "group relative overflow-hidden rounded-xl border bg-white/50 p-5 shadow-sm transition-all hover:shadow-md hover:border-blue-100",
                      task.status === 'in-progress' && "bg-green-50",
                      task.status === 'done' && "bg-red-50"
                    )}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                    
                    {/* Action Buttons */}
                    <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <button
                        type="button"
                        className="flex items-center justify-center h-8 w-8 rounded-full bg-white/80 hover:bg-red-50 transition-colors border border-transparent hover:border-red-100"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          if (window.confirm('Are you sure you want to delete this task?')) {
                            deleteTask(task.id)
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </button>
                    </div>

                    <div className="relative flex items-start gap-4">
                      <button
                        onClick={() => toggleTaskStatus(task.id, task.status)}
                        className="mt-1 flex-shrink-0 transition-transform hover:scale-110"
                      >
                        {task.status === 'done' ? (
                          <CheckCircle2 className="h-5 w-5 text-red-500" />
                        ) : task.status === 'in-progress' ? (
                          <Circle className="h-5 w-5 text-green-500" />
                        ) : (
                          <Circle className="h-5 w-5 text-gray-400 hover:text-blue-500" />
                        )}
                      </button>
                      <div className="flex-grow min-w-0">
                        <h3 className={cn(
                          "text-base font-medium text-gray-900 truncate",
                          task.status === 'done' && "line-through"
                        )}>
                          {task.title}
                        </h3>
                        {task.description && (
                          <p className={cn(
                            "mt-1 text-sm text-gray-600 line-clamp-2",
                            task.status === 'done' && "line-through"
                          )}>
                            {task.description}
                          </p>
                        )}
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-600">
                          <Link
                            href={`/projects/${task.project_id}`}
                            className="flex items-center gap-1.5 bg-white/80 backdrop-blur-sm px-2 py-1 rounded-md hover:bg-blue-50 transition-colors"
                          >
                            <FolderKanban className="h-3.5 w-3.5" />
                            {task.project.title}
                          </Link>
                          <div className="flex items-center gap-1.5 bg-white/80 backdrop-blur-sm px-2 py-1 rounded-md">
                            <Clock className="h-3.5 w-3.5" />
                            {format(new Date(task.created_at), 'MMM d, yyyy')}
                          </div>
                          {task.due_date && (
                            <div className="flex items-center gap-1.5 bg-white/80 backdrop-blur-sm px-2 py-1 rounded-md">
                              <CalendarDays className="h-3.5 w-3.5" />
                              Due {format(new Date(task.due_date), 'MMM d, yyyy')}
                            </div>
                          )}
                          <Badge variant="secondary" className={cn(
                            "px-2 py-1 text-xs rounded-md shadow-sm backdrop-blur-sm",
                            task.status === 'done' && "bg-red-100 text-red-700 border-red-200/50",
                            task.status === 'in-progress' && "bg-green-100 text-green-700 border-green-200/50",
                            task.status === 'todo' && "bg-gray-100 text-gray-700 border-gray-200/50"
                          )}>
                            {task.status === 'in-progress' ? 'In Progress' : 
                             task.status === 'done' ? 'Completed' : 'To Do'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
} 