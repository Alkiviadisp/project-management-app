"use client"

import * as React from "react"
import { Suspense } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Plus, FolderKanban, CalendarDays, Clock, Tag, Paperclip, Edit2, Trash2, MoreVertical, Circle, CheckCircle2, ListTodo, ChevronDown, RotateCcw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { toast } from "sonner"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import dynamic from "next/dynamic"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

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
  cover_image: {
    url: string
    name: string
  } | null
}

type Task = {
  id: string
  title: string
  description: string | null
  status: "todo" | "in-progress" | "done"
  due_date: string | null
  project_id: string
  created_at: string
}

const DynamicPieChart = dynamic(() => import('@/components/charts/task-distribution-chart'), {
  ssr: false,
  loading: () => (
    <div className="h-[80px] flex items-center justify-center">
      <div className="h-[70px] w-[70px] rounded-full border-2 border-t-blue-500 animate-spin" />
    </div>
  )
})

function ProjectList() {
  const [projects, setProjects] = React.useState<Project[]>([])
  const [tasks, setTasks] = React.useState<Task[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const filterParam = searchParams.get('filter')
  const [statusFilter, setStatusFilter] = React.useState<Project['status'] | "all">("all")
  const [isCompletedOpen, setIsCompletedOpen] = React.useState(false)

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("User not found")

        const [projectsResponse, tasksResponse] = await Promise.all([
          supabase
            .from('projects')
            .select('*')
            .eq('created_by', user.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('tasks')
            .select('*')
            .eq('created_by', user.id)
            .order('created_at', { ascending: false })
        ])

        if (projectsResponse.error) throw projectsResponse.error
        if (tasksResponse.error) throw tasksResponse.error

        setProjects(projectsResponse.data)
        setTasks(tasksResponse.data)
      } catch (error) {
        console.error('Error fetching data:', error)
        toast.error("Failed to load projects")
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

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

  const getCardColors = (baseColor: string) => {
    const colors: { [key: string]: { bg: string, hover: string, text: string, border: string } } = {
      'bg-blue-500': { bg: 'bg-blue-50', hover: 'hover:bg-blue-100', text: 'text-blue-700', border: 'border-blue-100' },
      'bg-purple-500': { bg: 'bg-purple-50', hover: 'hover:bg-purple-100', text: 'text-purple-700', border: 'border-purple-100' },
      'bg-pink-500': { bg: 'bg-pink-50', hover: 'hover:bg-pink-100', text: 'text-pink-700', border: 'border-pink-100' },
      'bg-indigo-500': { bg: 'bg-indigo-50', hover: 'hover:bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-100' },
      'bg-teal-500': { bg: 'bg-teal-50', hover: 'hover:bg-teal-100', text: 'text-teal-700', border: 'border-teal-100' },
      'bg-green-500': { bg: 'bg-green-50', hover: 'hover:bg-green-100', text: 'text-green-700', border: 'border-green-100' },
      'bg-yellow-500': { bg: 'bg-yellow-50', hover: 'hover:bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-100' },
      'bg-orange-500': { bg: 'bg-orange-50', hover: 'hover:bg-orange-100', text: 'text-orange-700', border: 'border-orange-100' },
      'bg-red-500': { bg: 'bg-red-50', hover: 'hover:bg-red-100', text: 'text-red-700', border: 'border-red-100' },
      'bg-cyan-500': { bg: 'bg-cyan-50', hover: 'hover:bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-100' },
    }
    return colors[baseColor] || colors['bg-blue-500']
  }

  const handleDeleteProject = async (projectId: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)

      if (error) throw error

      setProjects(projects.filter(project => project.id !== projectId))
      toast.success("Project deleted successfully")
    } catch (error) {
      console.error('Error deleting project:', error)
      toast.error("Failed to delete project")
    }
  }

  const handleEditProject = (projectId: string) => {
    router.push(`/projects/new?edit=${projectId}`)
  }

  // Add statistics calculations
  const todoCount = projects.filter(p => p.status === 'todo').length
  const inProgressCount = projects.filter(p => p.status === 'in-progress').length
  const doneCount = projects.filter(p => p.status === 'done').length
  const totalProjects = projects.length

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

  const handleCardClick = (status: Project['status'] | "all") => {
    setStatusFilter(status);
    if (status === "done") {
      setIsCompletedOpen(true);
    } else {
      setIsCompletedOpen(false);
    }
  };

  const filteredProjects = React.useMemo(() => {
    return projects
      .filter(project => {
        if (statusFilter !== "all") {
          return project.status === statusFilter;
        }
        return true;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [projects, statusFilter])

  const getProjectTaskCount = (projectId: string) => {
    const totalTasks = tasks.filter(task => task.project_id === projectId).length
    const completedTasks = tasks.filter(task => task.project_id === projectId && task.status === 'done').length
    return { total: totalTasks, completed: completedTasks }
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
                  <FolderKanban className="h-5 w-5 text-blue-600" />
                </div>
                <h1 className="text-xl font-semibold">Projects</h1>
              </div>
            </div>
            <Button
              asChild
              className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white transition-all shadow-lg hover:shadow-xl"
            >
              <Link href="/projects/new">
                <Plus className="mr-2 h-4 w-4" />
                New Project
              </Link>
            </Button>
          </div>
        </header>

        <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-start py-10 px-4">
          <div className="w-full max-w-7xl space-y-6 relative">
            {/* Statistics Cards */}
            <div className="sticky top-16 z-30 bg-gradient-to-br from-white to-blue-50/20 backdrop-blur-sm pt-4 pb-6 -mx-4 px-4 border-b">
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
                          {((todoCount / totalProjects) * 100).toFixed(1)}% of total projects
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
                          {((inProgressCount / totalProjects) * 100).toFixed(1)}% of total projects
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </button>

                <button 
                  onClick={() => handleCardClick("done")}
                  className="transition-transform hover:scale-105 focus:outline-none"
                >
                  <Card className={cn(
                    "hover:border-blue-200 hover:shadow-md transition-all",
                    statusFilter === "done" && "border-red-500 shadow-md"
                  )}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Done</CardTitle>
                      <CheckCircle2 className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="h-[80px]">
                        <div className="text-2xl font-bold">{doneCount}</div>
                        <p className="text-xs text-muted-foreground">
                          {((doneCount / totalProjects) * 100).toFixed(1)}% of total projects
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
                      <CardTitle className="text-sm font-medium">Project Distribution</CardTitle>
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
            </div>

            {/* Completed Projects Section */}
            <div className="rounded-lg border bg-white shadow-sm">
              <Collapsible open={isCompletedOpen} onOpenChange={setIsCompletedOpen}>
                <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-red-600" />
                    <span>Completed Projects</span>
                    <Badge variant="secondary" className="ml-2 bg-red-100 text-red-600">
                      {doneCount}
                    </Badge>
                  </div>
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="divide-y border-t">
                    {filteredProjects.filter(project => project.status === 'done').length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center text-sm text-muted-foreground">
                        <CheckCircle2 className="h-8 w-8 text-muted-foreground/50 mb-2" />
                        <p>No completed projects yet</p>
                        <p className="text-xs mt-1">Projects marked as done will appear here</p>
                      </div>
                    ) : (
                      filteredProjects
                        .filter(project => project.status === 'done')
                        .map((project) => (
                          <div
                            key={project.id}
                            className={cn(
                              "group flex items-center gap-3 bg-red-50/50 px-4 py-3",
                              new Date() > new Date(project.due_date) && "bg-red-50"
                            )}
                          >
                            <button
                              onClick={async () => {
                                if (window.confirm('Move this project back to in progress?')) {
                                  const { data: { user } } = await supabase.auth.getUser()
                                  if (!user) {
                                    toast.error("User not found")
                                    return
                                  }

                                  const { error: updateError } = await supabase
                                    .from('projects')
                                    .update({ status: 'in-progress' })
                                    .eq('id', project.id)
                                    .eq('created_by', user.id)

                                  if (updateError) {
                                    toast.error("Failed to update project status")
                                    return
                                  }

                                  setProjects(prev => prev.map(p => 
                                    p.id === project.id ? { ...p, status: 'in-progress' } : p
                                  ))

                                  toast.success("Project moved back to in progress")
                                }
                              }}
                              className="flex-shrink-0 transition-transform hover:scale-110"
                            >
                              <CheckCircle2 className="h-4 w-4 text-red-600" />
                            </button>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <h3 className="text-sm font-medium text-gray-900">
                                    {project.title}
                                  </h3>
                                  <Badge variant="secondary" className={cn("px-1.5 py-0 text-xs", getPriorityColor(project.priority))}>
                                    {project.priority}
                                  </Badge>
                                  {project.tags.length > 0 && (
                                    <div className="flex items-center gap-1">
                                      {project.tags.map((tag, index) => (
                                        <Badge
                                          key={index}
                                          variant="secondary"
                                          className="px-1.5 py-0 text-xs bg-gray-100 text-gray-700"
                                        >
                                          {tag}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <CalendarDays className="h-3 w-3" />
                                    <span className={cn(
                                      new Date() > new Date(project.due_date) && "text-red-600 font-medium"
                                    )}>
                                      Due {format(new Date(project.due_date), 'MMM d, yyyy')}
                                      {new Date() > new Date(project.due_date) && " (Overdue)"}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={async (e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        if (window.confirm('Move this project back to in progress?')) {
                                          const { data: { user } } = await supabase.auth.getUser()
                                          if (!user) {
                                            toast.error("User not found")
                                            return
                                          }

                                          const { error: updateError } = await supabase
                                            .from('projects')
                                            .update({ status: 'in-progress' })
                                            .eq('id', project.id)
                                            .eq('created_by', user.id)

                                          if (updateError) {
                                            toast.error("Failed to update project status")
                                            return
                                          }

                                          setProjects(prev => prev.map(p => 
                                            p.id === project.id ? { ...p, status: 'in-progress' } : p
                                          ))

                                          toast.success("Project moved back to in progress")
                                        }
                                      }}
                                      className="h-7 w-7 hover:bg-white/80 hover:text-green-600"
                                    >
                                      <RotateCcw className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        if (window.confirm('Are you sure you want to delete this project?')) {
                                          handleDeleteProject(project.id)
                                        }
                                      }}
                                      className="h-7 w-7 hover:bg-white/80 hover:text-red-600"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                              {project.description && (
                                <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
                                  {project.description}
                                </p>
                              )}
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="h-40 rounded-xl border bg-white/50 p-6 animate-pulse"
                  />
                ))}
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                  <FolderKanban className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">No projects yet</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Create your first project to get started
                </p>
                <Button
                  asChild
                  className="mt-6 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white"
                >
                  <Link href="/projects/new">
                    <Plus className="mr-2 h-4 w-4" />
                    New Project
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredProjects
                  .filter(project => project.status !== 'done')
                  .map((project) => {
                    const colors = getCardColors(project.color)
                    return (
                      <div
                        key={project.id}
                        className={cn(
                          "group relative flex overflow-hidden rounded-lg border transition-all hover:shadow-md min-h-[200px]",
                          new Date() > new Date(project.due_date) && project.status !== 'done' ? "bg-red-50 border-red-200" : "bg-white",
                          "hover:bg-slate-50"
                        )}
                      >
                        <div className="absolute right-2 top-2 z-10 flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              handleEditProject(project.id)
                            }}
                            className="h-7 w-7 bg-white/80 hover:bg-white shadow-sm hover:text-blue-600"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              if (window.confirm('Are you sure you want to delete this project?')) {
                                handleDeleteProject(project.id)
                              }
                            }}
                            className="h-7 w-7 bg-white/80 hover:bg-white shadow-sm hover:text-red-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>

                        {project.cover_image && (
                          <div className="absolute top-0 left-0 w-[100px] h-[100px] overflow-hidden bg-gradient-to-b from-black/5 to-black/20">
                            <Dialog>
                              <DialogTrigger asChild>
                                <img
                                  src={project.cover_image.url}
                                  alt={project.cover_image.name}
                                  className="h-full w-full object-cover transition-transform duration-300 hover:scale-105 cursor-zoom-in"
                                />
                              </DialogTrigger>
                              <DialogContent className="max-w-3xl">
                                <DialogHeader>
                                  <DialogTitle>{project.title}</DialogTitle>
                                  <DialogDescription>Project Cover Image</DialogDescription>
                                </DialogHeader>
                                <img
                                  src={project.cover_image.url}
                                  alt={project.cover_image.name}
                                  className="w-full rounded-lg"
                                />
                              </DialogContent>
                            </Dialog>
                          </div>
                        )}

                        <div className="flex-1 p-4">
                          <div className="space-y-3">
                            <div className={cn("space-y-1", project.cover_image && "pl-[108px]")}>
                              <h3 className="text-base font-semibold line-clamp-1 text-gray-900">
                                {project.title}
                              </h3>
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {project.description}
                              </p>
                            </div>

                            <div className={cn("flex flex-wrap gap-1.5", project.cover_image && "pl-[108px]")}>
                              <Badge variant="secondary" className={cn("px-1.5 py-0 text-xs", getStatusColor(project.status))}>
                                {project.status.replace('-', ' ')}
                              </Badge>
                              <Badge variant="secondary" className={cn("px-1.5 py-0 text-xs", getPriorityColor(project.priority))}>
                                {project.priority}
                              </Badge>
                            </div>
                          </div>

                          <div className="mt-8 space-y-3">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <ListTodo className="h-3 w-3" />
                              <div className="flex-1">
                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden transition-colors group-hover:bg-slate-200">
                                  <div 
                                    className="h-full bg-blue-500 rounded-full transition-all" 
                                    style={{ 
                                      width: `${getProjectTaskCount(project.id).total === 0 ? 0 : 
                                        (getProjectTaskCount(project.id).completed / getProjectTaskCount(project.id).total) * 100}%` 
                                    }} 
                                  />
                                </div>
                              </div>
                              <span className="flex-shrink-0">{getProjectTaskCount(project.id).completed}/{getProjectTaskCount(project.id).total}</span>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <CalendarDays className="h-3 w-3" />
                                <span className={cn(
                                  new Date() > new Date(project.due_date) && "text-red-600 font-medium"
                                )}>
                                  Due {format(new Date(project.due_date), 'MMM d, yyyy')}
                                  {new Date() > new Date(project.due_date) && " (Overdue)"}
                                </span>
                              </div>
                              {project.tags.length > 0 && (
                                <div className="flex items-center gap-1.5">
                                  <Tag className="h-3 w-3 text-muted-foreground" />
                                  <div className="flex flex-wrap gap-1">
                                    {project.tags.map((tag, index) => (
                                      <Badge
                                        key={index}
                                        variant="secondary"
                                        className="px-1.5 py-0 text-xs bg-slate-100 text-slate-700"
                                      >
                                        {tag}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {project.attachments.length > 1 && (
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <Paperclip className="h-3 w-3" />
                                  <span>{project.attachments.length} attachments</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <Link 
                          href={`/projects/${project.id}`} 
                          className="absolute inset-0 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                          <span className="sr-only">View project</span>
                        </Link>
                      </div>
                    )
                  })}
              </div>
            )}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">
      <div className="h-8 w-8 rounded-full border-2 border-t-blue-500 animate-spin" />
    </div>}>
      <ProjectList />
    </Suspense>
  )
} 