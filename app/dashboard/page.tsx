"use client"

import * as React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { LayoutDashboard, ArrowRight, FolderKanban, CalendarCheck, ListTodo, CalendarDays, Edit2, Trash2, Cloud, CloudRain, Sun, CloudSun, CloudFog, CloudLightning, CloudSnow, Cloudy, Settings, Locate } from "lucide-react"
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

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
  due_date: string | null
  created_at: string
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

type StatItem = {
  name: string
  value: string
  icon?: React.ReactNode
  href?: string
  description?: string
  customContent?: React.ReactNode
  headerContent?: React.ReactNode
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
      name: "Completed Projects",
      value: completedProjects.toString(),
      icon: <ListTodo className="h-4 w-4 text-muted-foreground" />,
      href: "/projects?filter=completed"
    },
    {
      name: "Weather",
      value: "Loading...", // This will be updated once we add the API key
      icon: <Cloud className="h-4 w-4 text-muted-foreground" />
    },
  ]
}

// Update the chart config before the DashboardPage component
const chartConfig = {
  projects: {
    label: "Projects",
    color: "#00C2FF", // Electric Blue for bar chart
  },
  tasks: {
    label: "Tasks",
    color: "#01E076", // Bright Green for tasks bar chart
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
  const [weather, setWeather] = React.useState({
    city: "Loading location...",
    temperature: 0,
    description: "",
    condition: "cloudy",
  })
  const supabase = createClient()
  const router = useRouter()
  const [customCity, setCustomCity] = React.useState("")
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false)
  
  const getWeatherIcon = (condition: string, description: string) => {
    const lowerCondition = condition.toLowerCase()
    const lowerDescription = description.toLowerCase()

    if (lowerCondition.includes("thunderstorm")) {
      return <CloudLightning className="h-5 w-5 text-yellow-400" />
    } else if (lowerCondition.includes("drizzle") || lowerCondition.includes("rain")) {
      return <CloudRain className="h-5 w-5 text-blue-400" />
    } else if (lowerCondition.includes("snow")) {
      return <Cloud className="h-5 w-5 text-blue-200" />
    } else if (["mist", "fog", "haze"].some(condition => lowerDescription.includes(condition))) {
      return <Cloud className="h-5 w-5 text-gray-400" />
    } else if (lowerCondition.includes("clear")) {
      return <Sun className="h-5 w-5 text-yellow-400" />
    } else if (lowerDescription.includes("scattered clouds") || lowerDescription.includes("few clouds")) {
      return <CloudSun className="h-5 w-5 text-gray-400" />
    } else if (lowerDescription.includes("broken clouds") || lowerDescription.includes("overcast")) {
      return <Cloud className="h-5 w-5 text-gray-400" />
    }
    return <Cloud className="h-5 w-5 text-muted-foreground" />
  }

  const fetchWeatherByCoords = React.useCallback(async (lat: number, lon: number) => {
    try {
      const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`
      )
      if (!response.ok) throw new Error('Weather data fetch failed')
      const data = await response.json()
      setWeather({
        city: data.name,
        temperature: Math.round(data.main.temp),
        description: data.weather[0].description,
        condition: data.weather[0].main,
      })
    } catch (error) {
      console.error('Error fetching weather:', error)
      toast.error("Failed to fetch weather data")
    }
  }, [])

  const fetchWeatherByCity = React.useCallback(async (city?: string) => {
    try {
      const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY
      const cityToUse = city || localStorage.getItem('lastUsedCity') || process.env.NEXT_PUBLIC_DEFAULT_CITY || "London"
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${cityToUse}&appid=${apiKey}&units=metric`
      )
      if (response.status === 404) {
        toast.error(`City "${cityToUse}" not found. Please try another city name.`)
        return
      }
      if (!response.ok) {
        toast.error("Failed to fetch weather data. Please try again later.")
        return
      }
      const data = await response.json()
      setWeather({
        city: data.name,
        temperature: Math.round(data.main.temp),
        description: data.weather[0].description,
        condition: data.weather[0].main,
      })
      // Store the successfully fetched city
      if (city) {
        localStorage.setItem('lastUsedCity', data.name)
      }
      setIsPopoverOpen(false)
      toast.success("Weather updated successfully")
    } catch (error) {
      toast.error("Failed to connect to weather service. Please try again later.")
    }
  }, [])

  const handleLocationRefresh = React.useCallback(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          fetchWeatherByCoords(latitude, longitude)
          // Remove stored city when using geolocation
          localStorage.removeItem('lastUsedCity')
          toast.success("Location updated successfully")
        },
        (error) => {
          console.error('Geolocation error:', error)
          toast.error("Couldn't get location. Using default city.")
          fetchWeatherByCity()
        }
      )
    } else {
      toast.error("Geolocation is not supported by your browser")
      fetchWeatherByCity()
    }
  }, [fetchWeatherByCoords, fetchWeatherByCity])

  const handleCitySubmit = React.useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customCity.trim()) {
      toast.error("Please enter a city name")
      return
    }
    await fetchWeatherByCity(customCity.trim())
    setCustomCity("")
  }, [customCity, fetchWeatherByCity])

  // Add useEffect for initial weather fetch
  React.useEffect(() => {
    // Check if we have a stored city
    const storedCity = localStorage.getItem('lastUsedCity')
    
    if (storedCity) {
      // If we have a stored city, use it
      fetchWeatherByCity(storedCity)
    } else {
      // If no stored city, try geolocation
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords
            fetchWeatherByCoords(latitude, longitude)
          },
          (error) => {
            console.error('Geolocation error:', error)
            fetchWeatherByCity()
          }
        )
      } else {
        fetchWeatherByCity()
      }
    }

    // Check when we last fetched weather data
    const lastFetch = localStorage.getItem('lastWeatherFetch')
    const currentTime = Date.now()
    const oneHour = 60 * 60 * 1000 // 1 hour in milliseconds

    // Only set up the interval if it's been more than an hour since last fetch
    if (!lastFetch || currentTime - parseInt(lastFetch) > oneHour) {
      localStorage.setItem('lastWeatherFetch', currentTime.toString())
      
      // Update weather every hour
      const weatherInterval = setInterval(() => {
        const storedCity = localStorage.getItem('lastUsedCity')
        if (storedCity) {
          fetchWeatherByCity(storedCity)
        } else if ("geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition(
            (position) => fetchWeatherByCoords(position.coords.latitude, position.coords.longitude),
            () => fetchWeatherByCity()
          )
        } else {
          fetchWeatherByCity()
        }
        localStorage.setItem('lastWeatherFetch', Date.now().toString())
      }, oneHour)

      return () => clearInterval(weatherInterval)
    }
  }, [fetchWeatherByCoords, fetchWeatherByCity])

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
            .select('id, title, status, project_id, due_date, created_at')
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

  // Update stats calculation
  const stats = React.useMemo<StatItem[]>(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const activeProjects = projects.filter(p => p.status === "todo" || p.status === "in-progress").length

    // Calculate tasks due today (only todo and in-progress tasks)
    const tasksToday = projects.reduce((count, project) => {
      if (!Array.isArray(project.tasks)) return count
      
      return count + project.tasks.filter(task => {
        if (!task.due_date) return false
        
        const taskDate = new Date(task.due_date)
        taskDate.setHours(0, 0, 0, 0)
        
        // Include tasks that are due today OR overdue
        return taskDate.getTime() <= today.getTime() && 
               (task.status === 'todo' || task.status === 'in-progress')
      }).length
    }, 0)

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
        value: tasksToday.toString(),
        icon: <CalendarCheck className="h-4 w-4 text-muted-foreground" />,
        href: "/tasks?filter=due-today"
      },
      {
        name: "Completed Projects",
        value: completedProjects.toString(),
        icon: <ListTodo className="h-4 w-4 text-muted-foreground" />,
        href: "/projects?filter=completed"
      },
      {
        name: "Current Weather",
        value: "",
        customContent: (
          <div className="flex items-center gap-2 text-lg">
            <span className="font-medium">{weather.city}</span>
            <span className="font-bold">{weather.temperature}°C</span>
            <span className="text-sm text-muted-foreground capitalize">
              {weather.description}
            </span>
          </div>
        ),
        headerContent: (
          <>
            <div className="flex items-center gap-2">
              <span>Current Weather</span>
              <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-4 w-4 hover:bg-slate-100 rounded-full">
                    <Settings className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-60 p-2">
                  <form onSubmit={handleCitySubmit} className="flex flex-col gap-2">
                    <div className="text-sm font-medium">Change City</div>
                    <Input
                      type="text"
                      placeholder="Enter city name"
                      value={customCity}
                      onChange={(e) => setCustomCity(e.target.value)}
                      className="h-8 text-sm"
                    />
                    <Button type="submit" size="sm" className="w-full">
                      Update
                    </Button>
                  </form>
                </PopoverContent>
              </Popover>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-4 w-4 hover:bg-slate-100 rounded-full"
                onClick={handleLocationRefresh}
                title="Update location"
              >
                <Locate className="h-3 w-3 text-muted-foreground" />
              </Button>
            </div>
          </>
        )
      },
    ]
  }, [projects, weather, customCity, handleCitySubmit, handleLocationRefresh, isPopoverOpen])

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

  // Add this after the projectProgressData calculation
  const taskProgressData = React.useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), i)
      date.setHours(0, 0, 0, 0)
      return date
    }).reverse()

    return last7Days.map(date => {
      const dayTasks = projects.reduce((count, project) => {
        if (!Array.isArray(project.tasks)) return count
        
        const tasksOnDay = project.tasks.filter(task => {
          const taskDate = new Date(task.created_at)
          taskDate.setHours(0, 0, 0, 0)
          return taskDate.getTime() === date.getTime()
        })

        return count + tasksOnDay.length
      }, 0)

      return {
        date: format(date, 'MMM dd'),
        tasks: dayTasks,
      }
    })
  }, [projects])

  // Update the projectStatusData with new colors
  const projectStatusData = React.useMemo(() => [
    { status: "todo", count: projects.filter(p => p.status === "todo").length, fill: "#01E076" }, // Green
    { status: "inProgress", count: projects.filter(p => p.status === "in-progress").length, fill: "#00C2FF" }, // Blue
    { status: "done", count: projects.filter(p => p.status === "done").length, fill: "#E5E5E5" }, // Pale Grey
  ], [projects])

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
              <h1 className="text-xl font-semibold">Hello!, {userNickname}</h1>
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
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        {stat.headerContent || stat.name}
                      </CardTitle>
                      {!stat.headerContent && stat.icon}
                    </CardHeader>
                    <CardContent>
                      {stat.customContent ? (
                        <>
                          {stat.customContent}
                          {stat.description && (
                            <p className="text-xs text-muted-foreground capitalize mt-1">
                              {stat.description}
                            </p>
                          )}
                        </>
                      ) : (
                        <>
                      <div className="text-2xl font-bold">{stat.value}</div>
                          {stat.description && (
                            <p className="text-xs text-muted-foreground capitalize">
                              {stat.description}
                            </p>
                          )}
                        </>
                      )}
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
                  <Card key={index} className={cn(
                    stat.name === "Current Weather" && "relative"
                  )}>
                    {stat.name === "Current Weather" && (
                      <div className="absolute top-2 right-2 scale-[2] origin-top-right">
                        {getWeatherIcon(weather.condition, weather.description)}
                      </div>
                    )}
                    {cardContent}
                  </Card>
                )
              })}
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid gap-4 md:grid-cols-3">
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
                <CardTitle className="text-sm font-medium">Task Progress</CardTitle>
                <CardDescription className="text-xs">Last 7 days</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer 
                  config={chartConfig}
                  className="mx-auto h-[120px]"
                >
                  <BarChart data={taskProgressData}>
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
                      dataKey="tasks" 
                      fill="#01E076"
                      radius={[4, 4, 0, 0]} 
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Project Status Distribution</CardTitle>
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
                <h2 className="font-medium">Active Projects</h2>
                <Badge variant="secondary" className="ml-2">
                  {projects.filter(project => project.status === 'todo' || project.status === 'in-progress').length}
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
              {projects
                .filter(project => project.status === 'todo' || project.status === 'in-progress')
                .slice(0, 5)
                .map(project => (
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
                    <Badge variant="secondary" className={cn("px-1.5 py-0 text-xs min-w-[60px] text-center flex items-center justify-center", 
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
