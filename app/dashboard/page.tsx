"use client"

import * as React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { LayoutDashboard, Clock, ArrowRight, CheckCircle2, FolderKanban, Search, Users, CalendarCheck, ListTodo, TrendingUp, TrendingDown } from "lucide-react"
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

  // Calculate stats based on projects
  const stats = React.useMemo(() => calculateStats(projects), [projects])

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

  React.useEffect(() => {
    async function fetchUserAndProjects() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("User not found")

        // Fetch user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('nickname')
          .eq('id', user.id)
          .single()

        if (profile?.nickname) {
          setUserNickname(profile.nickname)
        }

        // Fetch projects
        const { data: projectsData, error: projectsError } = await supabase
          .from('projects')
          .select('*')
          .eq('created_by', user.id)
          .order('created_at', { ascending: false })

        if (projectsError) throw projectsError

        setProjects(projectsData || [])
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserAndProjects()
  }, [])

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

  const ProjectCard = ({ project }: { project: Project }) => (
    <Card key={project.id} className="group bg-white transition-all hover:shadow-md">
      <CardHeader className="p-3 pb-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-grow">
            <h3 className="font-semibold line-clamp-1 text-sm">{project.title}</h3>
            <Progress 
              value={getProjectProgress(project.status)} 
              indicatorColor={getPriorityColor(project.priority)}
              className="mt-2"
            />
          </div>
          {project.attachments?.[0] ? (
            <div className="flex-shrink-0">
              <img
                src={project.attachments[0].url}
                alt={project.attachments[0].name}
                className="h-10 w-10 rounded-lg object-cover ring-1 ring-gray-200"
              />
            </div>
          ) : (
            <div className={cn(
              "h-10 w-10 rounded-lg flex items-center justify-center bg-blue-100",
              project.color
            )}>
              <FolderKanban className="h-5 w-5 text-blue-600" />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>Due {format(new Date(project.due_date), 'MMM d')}</span>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 gap-1 px-2 opacity-0 group-hover:opacity-100"
            asChild
          >
            <Link href={`/projects/${project.id}`}>
              View
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )

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
          <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-sm pt-4 pb-6">
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
              <CardHeader>
                <CardTitle>Project Progress</CardTitle>
                <CardDescription>Projects created in the last 7 days</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer 
                  config={chartConfig}
                  className="mx-auto h-[180px]"
                >
                  <BarChart data={projectProgressData}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      tickMargin={10}
                      axisLine={false}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent hideLabel />}
                    />
                    <Bar 
                      dataKey="projects" 
                      fill="#00C2FF"  // Electric Blue
                      radius={[4, 4, 0, 0]} 
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
              <CardFooter className="flex-col gap-2 text-sm">
                <div className="leading-none text-muted-foreground">
                  Total projects created in the last 7 days: {projectProgressData.reduce((sum, day) => sum + day.projects, 0)}
                </div>
              </CardFooter>
            </Card>
            <Card className="flex flex-col">
              <CardHeader className="items-center pb-0">
                <CardTitle>Project Status Distribution</CardTitle>
                <CardDescription>{format(new Date(), 'MMMM yyyy')}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 pb-0">
                <ChartContainer
                  config={chartConfig}
                  className="mx-auto aspect-square max-h-[250px]"
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
                      innerRadius={60}
                    >
                      <Pie
                        data={priorityData}
                        dataKey="count"
                        nameKey="priority"
                        fill="#000"
                        label
                      />
                    </Pie>
                  </PieChart>
                </ChartContainer>
              </CardContent>
              <CardFooter className="flex-col gap-2 text-sm">
                <div className="flex items-center gap-2 font-medium leading-none">
                  {completedProjectsTrend.isUp ? (
                    <>
                      Trending up by {completedProjectsTrend.trend}% this month{" "}
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    </>
                  ) : (
                    <>
                      Trending down by {Math.abs(Number(completedProjectsTrend.trend))}% this month{" "}
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    </>
                  )}
                </div>
                <div className="leading-none text-muted-foreground">
                  Showing total projects by current status
                </div>
              </CardFooter>
            </Card>
          </div>

          {/* Projects Section */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* To Do Column */}
            <div className="flex flex-col gap-4">
              <div className="rounded-xl bg-[#01E076]/10 p-4">
                <div className="flex items-center gap-2 px-2 pb-4">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <h2 className="font-semibold">To Do</h2>
                  <Badge variant="secondary" className="ml-auto">
                    {todoProjects.length}
                  </Badge>
                </div>
                <div className="space-y-4">
                  {todoProjects.map(project => (
                    <ProjectCard key={project.id} project={project} />
                  ))}
                  {todoProjects.length === 0 && (
                    <div className="rounded-lg border border-dashed p-4 text-center">
                      <p className="text-sm text-muted-foreground">No projects to do</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* In Progress Column */}
            <div className="flex flex-col gap-4">
              <div className="rounded-xl bg-[#00C2FF]/10 p-4">
                <div className="flex items-center gap-2 px-2 pb-4">
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  <h2 className="font-semibold">In Progress</h2>
                  <Badge variant="secondary" className="ml-auto">
                    {inProgressProjects.length}
                  </Badge>
                </div>
                <div className="space-y-4">
                  {inProgressProjects.map(project => (
                    <ProjectCard key={project.id} project={project} />
                  ))}
                  {inProgressProjects.length === 0 && (
                    <div className="rounded-lg border border-dashed p-4 text-center">
                      <p className="text-sm text-muted-foreground">No projects in progress</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Done Column */}
            <div className="flex flex-col gap-4">
              <div className="rounded-xl bg-[#E5E5E5]/20 p-4">
                <div className="flex items-center gap-2 px-2 pb-4">
                  <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
                  <h2 className="font-semibold">Done</h2>
                  <Badge variant="secondary" className="ml-auto">
                    {doneProjects.length}
                  </Badge>
                </div>
                <div className="space-y-4">
                  {doneProjects.map(project => (
                    <ProjectCard key={project.id} project={project} />
                  ))}
                  {doneProjects.length === 0 && (
                    <div className="rounded-lg border border-dashed p-4 text-center">
                      <p className="text-sm text-muted-foreground">No completed projects</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
