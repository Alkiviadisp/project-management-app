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
  Plus,
  ChevronDown
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { PieChart, Pie, Cell } from "recharts"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import dynamic from "next/dynamic"
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
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

const DynamicPieChart = dynamic(() => import('@/components/charts/task-distribution-chart'), {
  ssr: false,
  loading: () => (
    <div className="h-[80px] flex items-center justify-center">
      <div className="h-[70px] w-[70px] rounded-full border-2 border-t-blue-500 animate-spin" />
    </div>
  )
})

// Add the task form schema
const taskFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  due_date: z.date().optional(),
})

type TaskFormValues = z.infer<typeof taskFormSchema>

export default function TasksPage() {
  const [tasks, setTasks] = React.useState<Task[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState("")
  const supabase = createClient()
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [editingTask, setEditingTask] = React.useState<Task | null>(null)
  const [isCreatingTask, setIsCreatingTask] = React.useState(false)

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: "",
      description: "",
      due_date: undefined,
    },
  })

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

  // Add this effect to update form when editing
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

  const filteredTasks = React.useMemo(() => {
    return tasks
      .filter(task => task.status !== 'done') // Filter out completed tasks
      .filter(task => 
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.project.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => {
        // If both tasks have due dates, compare them
        if (a.due_date && b.due_date) {
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
        }
        // If only a has a due date, it comes first
        if (a.due_date) return -1
        // If only b has a due date, it comes first
        if (b.due_date) return 1
        // If neither has a due date, sort by created date
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
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

  // Add statistics calculations
  const todoCount = tasks.filter(t => t.status === 'todo').length
  const inProgressCount = tasks.filter(t => t.status === 'in-progress').length
  const doneCount = tasks.filter(t => t.status === 'done').length
  const totalTasks = tasks.length

  const pieChartData = [
    {
      name: 'To Do',
      value: todoCount,
      color: '#94a3b8'  // gray-400
    },
    {
      name: 'In Progress',
      value: inProgressCount,
      color: '#22c55e'  // green-500
    },
    {
      name: 'Done',
      value: doneCount,
      color: '#ef4444'  // red-500
    }
  ]

  // Add the edit task function
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
          <div className="w-full max-w-7xl space-y-6">
            {/* Statistics Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">To Do</CardTitle>
                  <Circle className="h-4 w-4 text-gray-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{todoCount}</div>
                  <p className="text-xs text-muted-foreground">
                    {((todoCount / totalTasks) * 100).toFixed(1)}% of total tasks
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">In Progress</CardTitle>
                  <Circle className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{inProgressCount}</div>
                  <p className="text-xs text-muted-foreground">
                    {((inProgressCount / totalTasks) * 100).toFixed(1)}% of total tasks
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Done</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{doneCount}</div>
                  <p className="text-xs text-muted-foreground">
                    {((doneCount / totalTasks) * 100).toFixed(1)}% of total tasks
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Task Distribution</CardTitle>
                  <ListTodo className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="h-[80px]">
                    <DynamicPieChart data={pieChartData} />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Completed Tasks Section */}
            {doneCount > 0 && (
              <div className="rounded-lg border bg-white shadow-sm">
                <Collapsible>
                  <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-red-600" />
                      <span>Completed Tasks</span>
                      <Badge variant="secondary" className="ml-2 bg-red-100 text-red-600">
                        {doneCount}
                      </Badge>
                    </div>
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="divide-y border-t">
                      {tasks
                        .filter(task => task.status === 'done')
                        .map((task) => (
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
                                <Link
                                  href={`/projects/${task.project_id}`}
                                  className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                                >
                                  <FolderKanban className="h-3 w-3" />
                                  {task.project.title}
                                </Link>
                                {task.due_date && (
                                  <span className="flex items-center gap-1">
                                    <CalendarDays className="h-3 w-3" />
                                    Due {format(new Date(task.due_date), 'MMM d')}
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                if (window.confirm('Are you sure you want to delete this task?')) {
                                  deleteTask(task.id)
                                }
                              }}
                              className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="h-4 w-4 text-red-600 hover:text-red-700" />
                            </button>
                          </div>
                        ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}

            {isLoading ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="space-y-4">
                    <div className="h-10 w-32 rounded-lg bg-gray-100 animate-pulse" />
                    {[...Array(2)].map((_, j) => (
                      <div
                        key={j}
                        className="h-32 rounded-xl border bg-white/50 animate-pulse"
                      />
                    ))}
                  </div>
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* To Do Column */}
                <div className="space-y-4">
                  <div className="sticky top-0 flex items-center gap-2 px-2 py-2 bg-white/80 backdrop-blur-sm z-10">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gray-100">
                      <Circle className="h-4 w-4 text-gray-600" />
                    </div>
                    <h2 className="text-sm font-medium text-gray-600">To Do</h2>
                    <Badge variant="secondary" className="ml-auto bg-gray-100 text-gray-600">
                      {filteredTasks.filter(t => t.status === 'todo').length}
                    </Badge>
                  </div>
                  <div className="space-y-3">
                    {filteredTasks
                      .filter(task => task.status === 'todo')
                      .map((task) => (
                        <div
                          key={task.id}
                          className="group relative overflow-hidden rounded-xl border bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-blue-100"
                        >
                          {/* Task content */}
                          <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                          
                          {/* Action Buttons */}
                          <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setEditingTask(task)
                                setIsDialogOpen(true)
                              }}
                              className="h-8 w-8 bg-white/80 hover:bg-blue-50 border border-transparent hover:border-blue-100"
                            >
                              <Pencil className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                if (window.confirm('Are you sure you want to delete this task?')) {
                                  deleteTask(task.id)
                                }
                              }}
                              className="h-8 w-8 bg-white/80 hover:bg-red-50 border border-transparent hover:border-red-100"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>

                          <div className="relative flex items-start gap-4">
                            <button
                              onClick={() => toggleTaskStatus(task.id, task.status)}
                              className="mt-1 flex-shrink-0 transition-transform hover:scale-110"
                            >
                              <Circle className="h-5 w-5 text-gray-400 hover:text-blue-500" />
                            </button>
                            <div className="flex-grow min-w-0">
                              <h3 className="text-base font-medium text-gray-900 truncate">
                                {task.title}
                              </h3>
                              {task.description && (
                                <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                                  {task.description}
                                </p>
                              )}
                              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                                <Link
                                  href={`/projects/${task.project_id}`}
                                  className="flex items-center gap-1.5 bg-white/80 backdrop-blur-sm px-2 py-1 rounded-md hover:bg-blue-50 transition-colors border border-gray-100"
                                >
                                  <FolderKanban className="h-3.5 w-3.5" />
                                  {task.project.title}
                                </Link>
                                {task.due_date && (
                                  <div className="flex items-center gap-1.5 bg-white/80 backdrop-blur-sm px-2 py-1 rounded-md border border-gray-100">
                                    <CalendarDays className="h-3.5 w-3.5 text-gray-500" />
                                    <span className="text-gray-600">
                                      Due {format(new Date(task.due_date), 'MMM d')}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                    ))}
                  </div>
                </div>

                {/* In Progress Column */}
                <div className="space-y-4">
                  <div className="sticky top-0 flex items-center gap-2 px-2 py-2 bg-white/80 backdrop-blur-sm z-10">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-green-100">
                      <Circle className="h-4 w-4 text-green-600" />
                    </div>
                    <h2 className="text-sm font-medium text-gray-600">In Progress</h2>
                    <Badge variant="secondary" className="ml-auto bg-green-100 text-green-600">
                      {filteredTasks.filter(t => t.status === 'in-progress').length}
                    </Badge>
                  </div>
                  <div className="space-y-3">
                    {filteredTasks
                      .filter(task => task.status === 'in-progress')
                      .map((task) => (
                        <div
                          key={task.id}
                          className="group relative overflow-hidden rounded-xl border bg-green-50 p-5 shadow-sm transition-all hover:shadow-md hover:border-green-100"
                        >
                          {/* Task content */}
                          <div className="absolute inset-0 bg-gradient-to-r from-green-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                          
                          {/* Action Buttons */}
                          <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setEditingTask(task)
                                setIsDialogOpen(true)
                              }}
                              className="h-8 w-8 bg-white/80 hover:bg-blue-50 border border-transparent hover:border-blue-100"
                            >
                              <Pencil className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                if (window.confirm('Are you sure you want to delete this task?')) {
                                  deleteTask(task.id)
                                }
                              }}
                              className="h-8 w-8 bg-white/80 hover:bg-red-50 border border-transparent hover:border-red-100"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>

                          <div className="relative flex items-start gap-4">
                            <button
                              onClick={() => toggleTaskStatus(task.id, task.status)}
                              className="mt-1 flex-shrink-0 transition-transform hover:scale-110"
                            >
                              <Circle className="h-5 w-5 text-green-500" />
                            </button>
                            <div className="flex-grow min-w-0">
                              <h3 className="text-base font-medium text-gray-900 truncate">
                                {task.title}
                              </h3>
                              {task.description && (
                                <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                                  {task.description}
                                </p>
                              )}
                              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                                <Link
                                  href={`/projects/${task.project_id}`}
                                  className="flex items-center gap-1.5 bg-white/80 backdrop-blur-sm px-2 py-1 rounded-md hover:bg-blue-50 transition-colors border border-gray-100"
                                >
                                  <FolderKanban className="h-3.5 w-3.5" />
                                  {task.project.title}
                                </Link>
                                {task.due_date && (
                                  <div className="flex items-center gap-1.5 bg-white/80 backdrop-blur-sm px-2 py-1 rounded-md border border-gray-100">
                                    <CalendarDays className="h-3.5 w-3.5 text-gray-500" />
                                    <span className="text-gray-600">
                                      Due {format(new Date(task.due_date), 'MMM d')}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </SidebarInset>

      {/* Edit Task Dialog */}
      <Dialog 
        open={isDialogOpen} 
        onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) setEditingTask(null)
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingTask ? 'Edit Task' : 'Create Task'}</DialogTitle>
            <DialogDescription>
              {editingTask 
                ? 'Update your task details below.'
                : 'Add the details for your new task.'
              }
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleEditTask)} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Task Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter task title"
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
                    <FormLabel className="text-sm font-medium">Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter task description"
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
                name="due_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="text-sm font-medium">Due Date</FormLabel>
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
                            <CalendarDays className="ml-auto h-5 w-5 opacity-50" />
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
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={isCreatingTask}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 rounded-lg h-12 text-base font-medium"
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
    </SidebarProvider>
  )
} 