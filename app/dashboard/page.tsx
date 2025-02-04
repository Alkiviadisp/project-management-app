"use client"

import * as React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { LayoutDashboard, Clock, ArrowRight, CheckCircle2, FolderKanban, Search, Users, CalendarCheck, ListTodo, TrendingUp, TrendingDown, CalendarDays, Edit2, Trash2 } from "lucide-react"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import { format, subDays } from "date-fns"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Pie, PieChart } from "recharts"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"
import { useRouter } from "next/navigation"
import { toast } from "react-hot-toast"

// Project colors for progress bars
const projectColors = [
  "#FF0F7B", // Vibrant Pink
  "#00C2FF", // Electric Blue
  "#01E076", // Bright Green
  "#FFB300", // Amber
  "#6C5CE7", // Bright Purple
  "#FF3860", // Strong Red
  "#3D5AFE", // Intense Blue
  "#00B8D4", // Cyan
  "#FF9100", // Orange
]

type Task = {
  id: string
  title: string
  status: "todo" | "in-progress" | "done"
  project_id: string
}

type Project = {
  id: string
  title: string
  description: string
  status: "todo" | "in-progress" | "done"
  due_date: string
  priority: "low" | "medium" | "high"
  tags: string[]
  tasks: Task[]
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

// Remove the static stats array and add these functions
const calculateStats = (projects: Project[]) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const activeProjects = projects.filter(p => p.status === "todo" || p.status === "in-progress").length
  const tasksToday = "5" // This should be replaced with actual tasks count once we implement tasks
  const completedProjects = projects.filter(p => p.status === "done").length

  return [
    {
      name: "Active Projects",
      value: activeProjects.toString(),
      icon: <ListTodo className="h-4 w-4 text-muted-foreground" />,
      href: "/projects?filter=active"
    },
    {
      name: "Tasks Due Today",
      value: tasksToday,
      icon: <CalendarCheck className="h-4 w-4 text-muted-foreground" />,
      href: "/tasks?filter=due-today"
    },
    {
      name: "Team Members",
      value: "5",
      icon: <Users className="h-4 w-4 text-muted-foreground" />
    },
    {
      name: "Completed Projects",
      value: completedProjects.toString(),
      icon: <ListTodo className="h-4 w-4 text-muted-foreground" />,
      href: "/projects?filter=completed"
    },
  ]
}

// Update the chart config before the DashboardPage component
const chartConfig = {
  projects: {
    label: "Projects",
    color: "#00C2FF", // Electric Blue for bar chart
  },
  todo: {
    label: "To Do",
    color: "#01E076", // Bright Green
  },
  inProgress: {
    label: "In Progress",
    color: "#00C2FF", // Electric Blue
  },
  done: {
    label: "Completed",
    color: "#E5E5E5", // Pale Grey
  },
} satisfies ChartConfig

export default function DashboardPage() {
  const [projects, setProjects] = React.useState<Project[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [userNickname, setUserNickname] = React.useState("")
  const supabase = createClient()
  const router = useRouter()

  // Calculate the month-over-month change in completed projects
  const completedProjectsTrend = React.useMemo(() => {
    const currentMonth = new Date().getMonth()
    const lastMonth = currentMonth - 1
    
    const thisMonthCompleted = projects.filter(p => {
      const date = new Date(p.created_at)
      return date.getMonth() === currentMonth
    }).length

    const lastMonthCompleted = projects.filter(p => {
      const date = new Date(p.created_at)
      return date.getMonth() === lastMonth
    }).length

    const percentageChange = lastMonthCompleted === 0 
      ? thisMonthCompleted * 100 
      : ((thisMonthCompleted - lastMonthCompleted) / lastMonthCompleted) * 100

    return {
      trend: percentageChange.toFixed(1),
      isUp: percentageChange >= 0
    }
  }, [projects])

  // Calculate stats based on projects
  const stats = React.useMemo(() => {
    // Calculate total tasks and completed tasks across all projects
    const allTasks = projects.reduce((acc, project) => [...acc, ...(project.tasks || [])], [] as Task[])
    const doneTasks = allTasks.filter(task => task.status === 'done')
    const completionPercentage = allTasks.length > 0 
      ? Math.round((doneTasks.length / allTasks.length) * 100)
      : 0

    return [
      {
        name: "Total Projects",
        value: projects.length,
        icon: <FolderKanban className="h-4 w-4 text-muted-foreground" />,
        href: "/projects"
      },
      {
        name: "Tasks Progress",
        value: `${completionPercentage}%`,
        icon: <CheckCircle2 className="h-4 w-4 text-muted-foreground" />,
      },
      {
        name: "Tasks",
        value: `${doneTasks.length}/${allTasks.length}`,
        icon: <ListTodo className="h-4 w-4 text-muted-foreground" />,
      },
      {
        name: "Month Trend",
        value: `${Math.abs(Number(completedProjectsTrend.trend))}%`,
        icon: completedProjectsTrend.isUp ? 
          <TrendingUp className="h-4 w-4 text-green-500" /> : 
          <TrendingDown className="h-4 w-4 text-red-500" />,
      }
    ]
  }, [projects, completedProjectsTrend])

  // Add this after the stats calculation
  const priorityData = React.useMemo(() => {
    const priorityCounts = projects.reduce((acc, project) => {
      acc[project.priority] = (acc[project.priority] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return [
      { priority: "low", count: priorityCounts.low || 0, fill: "var(--color-low)" },
      { priority: "medium", count: priorityCounts.medium || 0, fill: "var(--color-medium)" },
      { priority: "high", count: priorityCounts.high || 0, fill: "var(--color-high)" },
    ]
  }, [projects])

  // Add this after the priorityData calculation
  const projectProgressData = React.useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), i)
      date.setHours(0, 0, 0, 0)
      return date
    }).reverse()

    return last7Days.map(date => {
      const dayProjects = projects.filter(project => {
        const projectDate = new Date(project.created_at)
        projectDate.setHours(0, 0, 0, 0)
        return projectDate.getTime() === date.getTime()
      })

      return {
        date: format(date, 'MMM dd'),
        projects: dayProjects.length,
      }
    })
  }, [projects])

  // Update the projectStatusData with new colors
  const projectStatusData = React.useMemo(() => [
    { status: "todo", count: projects.filter(p => p.status === "todo").length, fill: "#01E076" }, // Green
    { status: "inProgress", count: projects.filter(p => p.status === "in-progress").length, fill: "#00C2FF" }, // Blue
    { status: "done", count: projects.filter(p => p.status === "done").length, fill: "#E5E5E5" }, // Pale Grey
  ], [projects])

  React.useEffect(() => {
    async function fetchProjects() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("User not found")

        // Fetch projects
        const { data: projectsData, error: projectsError } = await supabase
          .from('projects')
          .select('*')
          .eq('created_by', user.id)
          .order('created_at', { ascending: false })

        if (projectsError) throw projectsError

        // Fetch tasks for each project
        const projectsWithTasks = await Promise.all(projectsData.map(async (project) => {
          const { data: tasksData, error: tasksError } = await supabase
            .from('tasks')
            .select('id, title, status, project_id')
            .eq('project_id', project.id)

          if (tasksError) {
            console.error('Error fetching tasks:', tasksError)
            return {
              ...project,
              tasks: []
            }
          }

          return {
            ...project,
            tasks: tasksData || []
          }
        }))

        setProjects(projectsWithTasks)

        // Fetch user nickname
        const { data: profileData } = await supabase
          .from('profiles')
          .select('nickname')
          .eq('id', user.id)
          .single()

        if (profileData?.nickname) {
          setUserNickname(profileData.nickname)
        }
      } catch (error) {
        console.error('Error:', error)
        toast.error("Failed to load projects")
      } finally {
        setIsLoading(false)
      }
    }

    fetchProjects()
  }, [supabase])

  // Function to get task count and completion for a project
  const getProjectTaskCount = (project: Project) => {
    if (!project.tasks) return { total: 0, completed: 0 }
    const totalTasks = project.tasks.length
    const completedTasks = project.tasks.filter(task => task.status === 'done').length
    return { total: totalTasks, completed: completedTasks }
  }

  const todoProjects = projects.filter(p => p.status === "todo")
  const inProgressProjects = projects.filter(p => p.status === "in-progress")
  const doneProjects = projects.filter(p => p.status === "done")

  // Calculate progress based on project status
  const getProjectProgress = (status: Project['status']) => {
    switch (status) {
      case 'todo':
        return 0
      case 'in-progress':
        return 50
      case 'done':
        return 100
      default:
        return 0
    }
  }

  // Get color based on priority
  const getPriorityColor = (priority: Project['priority']) => {
    switch (priority) {
      case 'low':
        return projectColors[2] // Green
      case 'medium':
        return projectColors[3] // Amber
      case 'high':
        return projectColors[5] // Red
      default:
        return projectColors[0]
    }
  }

  if (isLoading) {
    return (
      <SidebarProvider>
        <AppSidebar className="hidden lg:block" />
        <SidebarInset>
          <div className="flex min-h-screen items-center justify-center">
            <div className="animate-pulse text-lg">Loading projects...</div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  return (
    <SidebarProvider>
      <AppSidebar className="hidden lg:block" />
      <SidebarInset className="bg-white">
        {/* Header */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b bg-white/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-white/60">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mx-4 h-6" />
            <div>
              <h1 className="text-xl font-semibold">Hello, {userNickname}</h1>
              <p className="text-sm text-muted-foreground">Here's what's happening with your projects today</p>
            </div>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-6 p-6">
          {/* Statistics Section */}
          <div className="sticky top-0 z-30 bg-white backdrop-blur-sm pt-4 pb-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {stats.map((stat, index) => {
                const isClickable = Boolean(stat.href)
                
                const cardContent = (
                  <>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        {stat.name}
                      </CardTitle>
                      {stat.icon}
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stat.value}</div>
                    </CardContent>
                  </>
                )

                return isClickable ? (
                  <Link key={index} href={stat.href!} className="transition-all hover:scale-105">
                    <Card className="hover:border-blue-200 hover:shadow-md">
                      {cardContent}
                    </Card>
                  </Link>
                ) : (
                  <Card key={index}>
                    {cardContent}
                  </Card>
                )
              })}
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Project Progress</CardTitle>
                <CardDescription className="text-xs">Last 7 days</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer 
                  config={chartConfig}
                  className="mx-auto h-[120px]"
                >
                  <BarChart data={projectProgressData}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      tickMargin={10}
                      axisLine={false}
                      tick={{ fontSize: 12 }}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent hideLabel />}
                    />
                    <Bar 
                      dataKey="projects" 
                      fill="#00C2FF"
                      radius={[4, 4, 0, 0]} 
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Status Distribution</CardTitle>
                <CardDescription className="text-xs">{format(new Date(), 'MMMM yyyy')}</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={chartConfig}
                  className="mx-auto h-[120px]"
                >
                  <PieChart>
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent hideLabel />}
                    />
                    <Pie
                      data={projectStatusData}
                      dataKey="count"
                      nameKey="status"
                      innerRadius={25}
                      outerRadius={40}
                    />
                  </PieChart>
                </ChartContainer>
                <div className="mt-2 flex items-center justify-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-[#01E076]" />
                    <span>To Do ({projectStatusData[0].count})</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-[#00C2FF]" />
                    <span>In Progress ({projectStatusData[1].count})</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-[#E5E5E5]" />
                    <span>Done ({projectStatusData[2].count})</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Projects Section */}
          <div className="rounded-lg border bg-white shadow-sm">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="flex items-center gap-2">
                <FolderKanban className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-medium">All Projects</h2>
                <Badge variant="secondary" className="ml-2">
                  {projects.length}
                </Badge>
              </div>
              <Button variant="ghost" size="sm" asChild className="gap-1 text-xs">
                <Link href="/projects">
                  View All
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            </div>
            <div className="divide-y">
              {projects.slice(0, 5).map(project => (
                <Link 
                  key={project.id} 
                  href={`/projects/${project.id}`}
                  className="group relative flex items-center gap-6 px-4 py-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="w-[200px] shrink-0">
                    <h3 className="font-bold text-sm truncate">{project.title}</h3>
                    <span className="text-xs text-muted-foreground">
                      {project.tasks?.length || 0} tasks
                    </span>
                  </div>
                  <div className="flex-1 flex items-center justify-center gap-2 min-w-[300px]">
                    <div className="flex items-center gap-2 w-full max-w-[400px]">
                      <Progress 
                        value={(() => {
                          const { total, completed } = getProjectTaskCount(project)
                          return total === 0 ? 0 : (completed / total) * 100
                        })()}
                        className="h-2"
                        indicatorColor="#3b82f6"
                      />
                      <span className="text-xs text-muted-foreground whitespace-nowrap w-[45px] text-center">
                        {(() => {
                          const { total, completed } = getProjectTaskCount(project)
                          return total === 0 ? '0%' : `${Math.round((completed / total) * 100)}%`
                        })()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 shrink-0">
                    <Badge variant="secondary" className={cn(
                      "px-1.5 py-0 text-xs min-w-[80px] text-center",
                      project.status === 'todo' && "bg-slate-100 text-slate-700",
                      project.status === 'in-progress' && "bg-blue-100 text-blue-700",
                      project.status === 'done' && "bg-green-100 text-green-700"
                    )}>
                      {project.status === 'in-progress' ? 'In Progress' : 
                       project.status === 'done' ? 'Completed' : 'To Do'}
                    </Badge>
                    <Badge variant="secondary" className={cn("px-1.5 py-0 text-xs min-w-[60px] text-center", 
                      project.priority === 'low' && "bg-green-100 text-green-700",
                      project.priority === 'medium' && "bg-yellow-100 text-yellow-700",
                      project.priority === 'high' && "bg-red-100 text-red-700"
                    )}>
                      {project.priority}
                    </Badge>
                    <span className={cn(
                      "text-xs text-muted-foreground flex items-center gap-1 min-w-[120px]",
                      new Date() > new Date(project.due_date) && project.status !== 'done' && "text-red-600 font-medium"
                    )}>
                      <CalendarDays className="h-3 w-3" />
                      Due {format(new Date(project.due_date), 'MMM d')}
                      {new Date() > new Date(project.due_date) && project.status !== 'done' && " (Overdue)"}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-50"
                        onClick={(e) => {
                          e.preventDefault()
                          router.push(`/projects/new?edit=${project.id}`)
                        }}
                      >
                        <Edit2 className="h-3.5 w-3.5 text-blue-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                        onClick={async (e) => {
                          e.preventDefault()
                          if (window.confirm('Are you sure you want to delete this project?')) {
                            try {
                              const { data: { user } } = await supabase.auth.getUser()
                              if (!user) throw new Error("User not found")

                              const { error } = await supabase
                                .from('projects')
                                .delete()
                                .eq('id', project.id)
                                .eq('created_by', user.id)

                              if (error) throw error

                              setProjects(projects.filter(p => p.id !== project.id))
                              toast.success("Project deleted successfully")
                            } catch (error) {
                              console.error('Error deleting project:', error)
                              toast.error("Failed to delete project")
                            }
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-600" />
                      </Button>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              ))}
              {projects.length === 0 && (
                <div className="px-4 py-3 text-sm text-muted-foreground text-center">
                  No projects yet
                </div>
              )}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
