"use client"

import * as React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { LayoutDashboard, Clock, ArrowRight, CheckCircle2, FolderKanban, Search, Users, CalendarCheck, ListTodo } from "lucide-react"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Pie, PieChart } from "recharts"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

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
  const dueToday = projects.filter(p => {
    const dueDate = new Date(p.due_date)
    dueDate.setHours(0, 0, 0, 0)
    return dueDate.getTime() === today.getTime()
  }).length
  const completedProjects = projects.filter(p => p.status === "done").length

  return [
    {
      name: "Active Projects",
      value: activeProjects.toString(),
      icon: <ListTodo className="h-4 w-4 text-muted-foreground" />,
    },
    {
      name: "Tasks Due Today",
      value: dueToday.toString(),
      icon: <CalendarCheck className="h-4 w-4 text-muted-foreground" />,
    },
    {
      name: "Completed Projects",
      value: completedProjects.toString(),
      icon: <ListTodo className="h-4 w-4 text-muted-foreground" />,
    },
  ]
}

// Add this before the DashboardPage component
const priorityChartConfig = {
  priority: {
    label: "Projects",
  },
  low: {
    label: "Low Priority",
    color: "hsl(142.1 76.2% 36.3%)", // Green
  },
  medium: {
    label: "Medium Priority",
    color: "hsl(48 96.5% 53.9%)", // Amber
  },
  high: {
    label: "High Priority",
    color: "hsl(346.8 77.2% 49.8%)", // Red
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
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-grow">
            <h3 className="font-semibold line-clamp-1">{project.title}</h3>
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
                className="h-12 w-12 rounded-lg object-cover ring-1 ring-gray-200"
              />
            </div>
          ) : (
            <div className={cn(
              "h-12 w-12 rounded-lg flex items-center justify-center bg-blue-100",
              project.color
            )}>
              <FolderKanban className="h-6 w-6 text-blue-600" />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span>Due {format(new Date(project.due_date), 'MMM d, yyyy')}</span>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button 
          variant="ghost" 
          size="sm" 
          className="ml-auto gap-2 opacity-0 group-hover:opacity-100"
          asChild
        >
          <Link href={`/projects/${project.id}`}>
            View Details
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
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
      <SidebarInset>
        {/* Header */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b bg-white/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-white/60">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mx-4 h-6" />
            <div>
              <h1 className="text-xl font-semibold">Good morning, {userNickname}</h1>
              <p className="text-sm text-muted-foreground">Here's what's happening with your projects today</p>
            </div>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-6 p-6">
          {/* Statistics Section */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {stats.map((stat, index) => (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.name}
                  </CardTitle>
                  {stat.icon}
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts Section */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Project Progress</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Project Progress Chart will go here */}
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  Project Progress Chart
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Task Priority Distribution</CardTitle>
                <CardDescription>Distribution of projects by priority level</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={priorityChartConfig}
                  className="mx-auto aspect-square max-h-[250px]"
                >
                  <PieChart>
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent hideLabel />}
                    />
                    <Pie
                      data={priorityData}
                      dataKey="count"
                      nameKey="priority"
                      innerRadius={60}
                    />
                  </PieChart>
                </ChartContainer>
              </CardContent>
              <CardFooter className="flex-col gap-2 text-sm">
                <div className="leading-none text-muted-foreground">
                  Total Projects: {projects.length}
                </div>
              </CardFooter>
            </Card>
          </div>

          {/* Projects Section */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* To Do Column */}
            <div className="flex flex-col gap-4">
              <div className="rounded-xl bg-[rgb(245,245,245)] p-4">
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
              <div className="rounded-xl bg-[rgb(245,245,245)] p-4">
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
              <div className="rounded-xl bg-[rgb(245,245,245)] p-4">
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
