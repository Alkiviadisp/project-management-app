"use client"

import * as React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Calendar as CalendarIcon, List } from "lucide-react"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import { createClient } from "@/lib/supabase/client"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { EventContentArg } from '@fullcalendar/core'

type Project = {
  id: string
  title: string
  description: string | null
  status: "todo" | "in-progress" | "done"
  priority: "low" | "medium" | "high"
  due_date: string
  created_at: string
  updated_at: string
}

type CalendarView = 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay'

function CalendarContent() {
  const [projects, setProjects] = React.useState<Project[]>([])
  const [view, setView] = React.useState<CalendarView>('dayGridMonth')
  const [selectedProjectId, setSelectedProjectId] = React.useState<string | null>(null)
  const sidebar = useSidebar()
  const supabase = createClient()
  const calendarRef = React.useRef<any>(null)
  const resizeTimeoutRef = React.useRef<NodeJS.Timeout>()
  const [isTransitioning, setIsTransitioning] = React.useState(false)

  React.useEffect(() => {
    fetchProjects()
  }, [])

  // Smooth calendar resize handling
  React.useEffect(() => {
    setIsTransitioning(true)
    
    const updateCalendarSize = () => {
      if (calendarRef.current) {
        const calendarApi = calendarRef.current.getApi()
        calendarApi.updateSize()
      }
    }

    // Clear any existing timeouts
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current)
    }

    // Initial update
    updateCalendarSize()

    // Update every frame during transition
    const startTime = Date.now()
    const duration = 400 // Slightly longer duration for smoother transition
    
    const animate = () => {
      const elapsed = Date.now() - startTime
      if (elapsed < duration) {
        updateCalendarSize()
        requestAnimationFrame(animate)
      } else {
        updateCalendarSize()
        setIsTransitioning(false)
      }
    }

    requestAnimationFrame(animate)

    // Cleanup
    return () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current)
      }
    }
  }, [sidebar.state])

  const fetchProjects = async () => {
    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching projects:', error)
      return
    }

    setProjects(projects || [])
  }

  const getEventColor = (priority: string, status: string) => {
    if (status === 'done') return '#10B981' // Green for completed
    switch (priority) {
      case 'low': return '#4ADE80'
      case 'medium': return '#FCD34D'
      case 'high': return '#EF4444'
      default: return '#6B7280'
    }
  }

  const calendarEvents = projects.map(project => ({
    id: project.id,
    title: project.title,
    start: new Date(project.created_at),
    end: new Date(project.due_date),
    backgroundColor: getEventColor(project.priority, project.status),
    borderColor: getEventColor(project.priority, project.status),
    extendedProps: {
      description: project.description,
      status: project.status,
      priority: project.priority
    }
  }))

  const handleEventClick = (info: { event: { id: string } }) => {
    setSelectedProjectId(info.event.id)
  }

  return (
    <>
      <AppSidebar className="hidden lg:block" />
      <SidebarInset className="bg-gradient-to-br from-white to-blue-50/20">
        <header className="flex h-16 shrink-0 items-center justify-between border-b bg-white/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-white/60">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mx-4 h-6" />
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              <h1 className="text-xl font-semibold">Calendar</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={view === 'dayGridMonth' ? 'default' : 'outline'}
              onClick={() => setView('dayGridMonth')}
              className="h-8"
            >
              Month
            </Button>
            <Button
              variant={view === 'timeGridWeek' ? 'default' : 'outline'}
              onClick={() => setView('timeGridWeek')}
              className="h-8"
            >
              Week
            </Button>
            <Button
              variant={view === 'timeGridDay' ? 'default' : 'outline'}
              onClick={() => setView('timeGridDay')}
              className="h-8"
            >
              Day
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <div className={cn(
            "grid grid-cols-1 gap-6 transition-all duration-500 ease-in-out will-change-[margin,width]",
            sidebar.state === "expanded" ? "lg:ml-0" : "lg:ml-8"
          )}>
            <div className={cn(
              "rounded-xl border bg-white p-6 shadow-sm transition-all duration-500 ease-in-out transform",
              isTransitioning && "scale-[0.999]" // Subtle scale effect during transition
            )}>
              <div className="transition-all duration-500 ease-in-out">
                <FullCalendar
                  ref={calendarRef}
                  plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                  initialView={view}
                  events={calendarEvents}
                  headerToolbar={false}
                  height="auto"
                  eventClick={handleEventClick}
                  firstDay={1}
                  expandRows={true}
                  dayMaxEvents={3}
                  eventContent={(arg: EventContentArg) => (
                    <div className={cn(
                      "p-1 text-xs font-medium text-white rounded cursor-pointer transition-all duration-200 hover:opacity-90 hover:scale-[1.02]",
                      arg.event.extendedProps.status === 'done' && "line-through opacity-70"
                    )}>
                      {arg.event.title}
                    </div>
                  )}
                />
              </div>
            </div>

            {/* Project List */}
            <div className={cn(
              "rounded-xl border bg-white shadow-sm transition-all duration-500 ease-in-out",
              isTransitioning && "scale-[0.999]" // Subtle scale effect during transition
            )}>
              <div className="flex items-center gap-2 border-b p-4">
                <List className="h-5 w-5" />
                <h2 className="text-lg font-semibold">Projects</h2>
              </div>
              <div className="divide-y">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className={cn(
                      "group flex items-center justify-between p-4 transition-colors hover:bg-slate-50",
                      selectedProjectId === project.id && "bg-slate-50"
                    )}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className={cn(
                          "font-medium",
                          project.status === 'done' && "line-through text-muted-foreground"
                        )}>
                          {project.title}
                        </h3>
                        <div className={cn(
                          "h-2 w-2 rounded-full",
                          project.status === 'todo' && "bg-slate-400",
                          project.status === 'in-progress' && "bg-blue-400",
                          project.status === 'done' && "bg-green-400"
                        )} />
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className={cn(
                          "capitalize",
                          project.priority === 'low' && "text-green-600",
                          project.priority === 'medium' && "text-yellow-600",
                          project.priority === 'high' && "text-red-600"
                        )}>
                          {project.priority} Priority
                        </span>
                        <span>Due {format(new Date(project.due_date), 'MMM d, yyyy')}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </SidebarInset>
    </>
  )
}

export default function CalendarPage() {
  return (
    <SidebarProvider>
      <CalendarContent />
    </SidebarProvider>
  )
} 