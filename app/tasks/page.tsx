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
  ChevronDown,
  RotateCcw,
  X
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
import { Suspense } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

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
  status: z.enum(["todo", "in-progress", "done"]),
})

type TaskFormValues = z.infer<typeof taskFormSchema>

function TaskList() {
  const [tasks, setTasks] = React.useState<Task[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<ProjectStatus | "all" | "overdue">("all")
  const [isCompletedOpen, setIsCompletedOpen] = React.useState(false)
  const supabase = createClient()
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [editingTask, setEditingTask] = React.useState<Task | null>(null)
  const [isCreatingTask, setIsCreatingTask] = React.useState(false)
  const [activeTask, setActiveTask] = React.useState<Task | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false)

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: "",
      description: "",
      due_date: undefined,
      status: "todo",
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

  // Add overdue tasks calculation
  const overdueCount = tasks.filter(t => 
    t.due_date && 
    new Date() > new Date(t.due_date) && 
    t.status !== 'done'
  ).length

  // Modify the filteredTasks to handle overdue filter
  const filteredTasks = React.useMemo(() => {
    return tasks
      .filter(task => {
        // Apply status filter
        if (statusFilter === "overdue") {
          return task.due_date && 
                 new Date() > new Date(task.due_date) && 
                 task.status !== 'done';
        }
        if (statusFilter !== "all") {
          return task.status === statusFilter;
        }
        return true;
      })
      .filter(task => 
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.project.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => {
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
  }, [tasks, searchQuery, statusFilter])

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
        status: values.status,
        updated_at: new Date().toISOString()
      }

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
          due_date: values.due_date?.toISOString() || null,
          updated_at: new Date().toISOString()
        })
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

  const handleCardClick = (status: ProjectStatus | "all" | "overdue") => {
    setStatusFilter(status);
    if (status === "done") {
      setIsCompletedOpen(true);
    } else {
      setIsCompletedOpen(false);
    }
  };

  // Add this function to handle drag end
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

  const formatDate = (date: string) => {
    return format(new Date(date), 'MMM d, yyyy')
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

        <main className="flex flex-col items-center justify-start py-10 px-4">
          <div className="w-full max-w-7xl space-y-6">
            <DndContext
              sensors={sensors}
              onDragEnd={handleDragEnd}
              onDragStart={handleDragStart}
              modifiers={[restrictToWindowEdges]}
            >
              {/* Statistics Cards and Done Drop Zone - Sticky */}
              <div className="sticky top-0 z-30">
                <div className="bg-white backdrop-blur-sm pt-4 pb-6 space-y-6">
                  {/* Statistics Cards */}
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <button 
                      onClick={() => handleCardClick("todo")}
                      className="transition-transform hover:scale-105 focus:outline-none"
                    >
                      <Card className={cn(
                        "hover:border-blue-200 hover:shadow-md transition-all",
                        statusFilter === "todo" && "border-blue-500 shadow-md"
                      )}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">To Do</CardTitle>
                          <Circle className="h-4 w-4 text-gray-600" />
                        </CardHeader>
                        <CardContent>
                          <div className="h-[80px]">
                            <div className="text-2xl font-bold">{todoCount}</div>
                            <p className="text-xs text-muted-foreground">
                              {((todoCount / totalTasks) * 100).toFixed(1)}% of total tasks
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </button>

                    <button 
                      onClick={() => handleCardClick("in-progress")}
                      className="transition-transform hover:scale-105 focus:outline-none"
                    >
                      <Card className={cn(
                        "hover:border-blue-200 hover:shadow-md transition-all",
                        statusFilter === "in-progress" && "border-green-500 shadow-md"
                      )}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">In Progress</CardTitle>
                          <Circle className="h-4 w-4 text-green-600" />
                        </CardHeader>
                        <CardContent>
                          <div className="h-[80px]">
                            <div className="text-2xl font-bold">{inProgressCount}</div>
                            <p className="text-xs text-muted-foreground">
                              {((inProgressCount / totalTasks) * 100).toFixed(1)}% of total tasks
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </button>

                    <button 
                      onClick={() => handleCardClick("overdue")}
                      className="transition-transform hover:scale-105 focus:outline-none"
                    >
                      <Card className={cn(
                        "hover:border-blue-200 hover:shadow-md transition-all",
                        statusFilter === "overdue" && "border-red-500 shadow-md"
                      )}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Overdue</CardTitle>
                          <Clock className="h-4 w-4 text-red-600" />
                        </CardHeader>
                        <CardContent>
                          <div className="h-[80px]">
                            <div className="text-2xl font-bold">{overdueCount}</div>
                            <p className="text-xs text-muted-foreground">
                              {((overdueCount / totalTasks) * 100).toFixed(1)}% of total tasks
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </button>

                    <button 
                      onClick={() => handleCardClick("all")}
                      className="transition-transform hover:scale-105 focus:outline-none"
                    >
                      <Card className={cn(
                        "hover:border-blue-200 hover:shadow-md transition-all",
                        statusFilter === "all" && "border-blue-500 shadow-md"
                      )}>
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
                    </button>
                  </div>

                  {/* Done Drop Zone */}
                  <DroppableColumn 
                    id="done" 
                    title=""
                    className="h-16 border-2 border-dashed border-red-200 bg-red-50/50 rounded-lg flex items-center justify-center"
                  >
                    <div className="flex items-center gap-2 text-red-500">
                      <CheckCircle2 className="h-5 w-5" />
                      <p className="text-sm">Drop here to mark as done</p>
                    </div>
                  </DroppableColumn>
                </div>
              </div>

              {/* Completed Tasks Section */}
              {doneCount > 0 && (
                <div className="rounded-lg border bg-white shadow-sm">
                  <Collapsible open={isCompletedOpen} onOpenChange={setIsCompletedOpen}>
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

              {/* Main Task Columns */}
              {!isLoading && filteredTasks.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* To Do Column */}
                  <DroppableColumn id="todo" title="To Do">
                    {filteredTasks
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
                    {filteredTasks
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
              )}

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
                ? 'Make changes to your task details below.'
                : 'Fill in the details for your new task below.'
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
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-12 text-base">
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
                {/* Project Info */}
                <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50/50 border">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm">
                    <FolderKanban className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Project</p>
                    <Link 
                      href={`/projects/${selectedTask.project_id}`}
                      className="text-base font-medium text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      {selectedTask.project.title}
                    </Link>
                  </div>
                </div>

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
                      <span>{selectedTask.due_date ? formatDate(selectedTask.due_date) : 'No due date'}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-gray-600">Created</h3>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span>{formatDate(selectedTask.created_at)}</span>
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
                      onClick={() => toggleTaskStatus(selectedTask.id, selectedTask.status)}
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
                    onClick={() => {
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

// Add this function to get the status color
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

// Update the TaskCard component definition
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
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <FolderKanban className="h-3 w-3" />
            <span>{task.project.title}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function DroppableColumn({ id, title, children, className }: { 
  id: string; 
  title: string; 
  children: React.ReactNode;
  className?: string;
}) {
  const { setNodeRef } = useDroppable({ id })
  const isMainColumn = id === 'todo' || id === 'in-progress'

  return (
    <div className="space-y-4">
      {title && <h2 className="text-lg font-semibold">{title}</h2>}
      <div 
        ref={setNodeRef} 
        className={cn(
          "space-y-4",
          isMainColumn && "p-4 rounded-lg border-2 border-dashed transition-colors min-h-[120px] h-fit pb-24",
          isMainColumn && id === "todo" && "bg-gray-50/50 border-gray-200",
          isMainColumn && id === "in-progress" && "bg-green-50/50 border-green-200",
          className
        )}
      >
        {children}
      </div>
    </div>
  )
}

export default function TasksPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">
      <div className="h-8 w-8 rounded-full border-2 border-t-blue-500 animate-spin" />
    </div>}>
      <TaskList />
    </Suspense>
  )
} 