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
import { Badge } from "@/components/ui/badge"

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

type CalendarView = 'dayGridMonth' | 'dayGridWeek' | 'dayGridDay'

function CalendarContent() {
  const [projects, setProjects] = React.useState<Project[]>([])
  const [view, setView] = React.useState<CalendarView>('dayGridMonth')
  const [selectedProjectId, setSelectedProjectId] = React.useState<string | null>(null)
  const [isViewTransitioning, setIsViewTransitioning] = React.useState(false)
  const sidebar = useSidebar()
  const supabase = createClient()
  const calendarRef = React.useRef<any>(null)
  const resizeTimeoutRef = React.useRef<NodeJS.Timeout>()
  const [isTransitioning, setIsTransitioning] = React.useState(false)

  // Handle view changes with animation
  const handleViewChange = (newView: CalendarView) => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi()
      const calendarEl = calendarRef.current.elRef.current
      
      // Determine animation direction
      const viewOrder = { dayGridMonth: 0, dayGridWeek: 1, dayGridDay: 2 }
      const isZoomingIn = viewOrder[newView] > viewOrder[view]
      
      // Initial animation state
      calendarEl.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
      calendarEl.style.transformOrigin = 'center center'
      
      // Exit animation
      if (isZoomingIn) {
        calendarEl.style.transform = 'scale(0.95) translateY(10px)'
      } else {
        calendarEl.style.transform = 'scale(1.05) translateY(-10px)'
      }
      calendarEl.style.opacity = '0'
      
      // Change view after a short delay
      setTimeout(() => {
        calendarApi.changeView(newView)
        setView(newView)
        
        // Enter animation
        requestAnimationFrame(() => {
          calendarEl.style.transform = 'scale(1) translateY(0)'
          calendarEl.style.opacity = '1'
        })
      }, 200)
    }
  }

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
              onClick={() => handleViewChange('dayGridMonth')}
              className="h-8"
            >
              Month
            </Button>
            <Button
              variant={view === 'dayGridWeek' ? 'default' : 'outline'}
              onClick={() => handleViewChange('dayGridWeek')}
              className="h-8"
            >
              Week
            </Button>
            <Button
              variant={view === 'dayGridDay' ? 'default' : 'outline'}
              onClick={() => handleViewChange('dayGridDay')}
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
              isTransitioning && "scale-[0.999]"
            )}>
              <div className={cn(
                "transition-all duration-300 ease-in-out",
                isViewTransitioning && "opacity-0 scale-98"
              )}>
                <style jsx global>{`
                  /* Enhanced transitions for view changes */
                  .fc-view-harness {
                    transition: height 0.5s cubic-bezier(0.4, 0, 0.2, 1) !important;
                  }

                  .fc-view-harness-active > div {
                    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1) !important;
                  }

                  /* Prevent flickering during transitions */
                  .fc .fc-view-harness {
                    transform-style: preserve-3d;
                    perspective: 1000px;
                    backface-visibility: hidden;
                  }

                  .fc-view-harness-active > div > * {
                    backface-visibility: hidden;
                    transform: translateZ(0);
                  }

                  /* Smooth height transitions */
                  .fc-view-harness {
                    transition: height 0.8s cubic-bezier(0.4, 0, 0.2, 1) !important;
                  }

                  /* Make day/week view cells much larger */
                  .fc-dayGridWeek-view .fc-daygrid-day,
                  .fc-dayGridDay-view .fc-daygrid-day {
                    min-height: 400px !important;
                  }

                  /* Month view more compact */
                  .fc-dayGridMonth-view .fc-daygrid-day {
                    min-height: 80px !important;
                    max-height: 80px !important;
                  }

                  .fc-dayGridMonth-view .fc-daygrid-day-frame {
                    min-height: unset !important;
                    padding: 2px !important;
                  }

                  .fc-dayGridMonth-view .fc-daygrid-day-events {
                    min-height: unset !important;
                    padding: 0 2px !important;
                  }

                  .fc-dayGridMonth-view .fc-daygrid-day-top {
                    padding: 2px !important;
                  }

                  /* Improve cell content layout for week/day */
                  .fc-dayGridWeek-view .fc-daygrid-day-frame,
                  .fc-dayGridDay-view .fc-daygrid-day-frame {
                    min-height: 100% !important;
                    padding: 12px !important;
                  }

                  .fc-dayGridWeek-view .fc-daygrid-day-events,
                  .fc-dayGridDay-view .fc-daygrid-day-events {
                    min-height: 85% !important;
                    padding: 12px !important;
                  }

                  /* Month view specific event styling */
                  .fc-dayGridMonth-view .fc-daygrid-event {
                    margin: 1px 0 !important;
                    padding: 1px 4px !important;
                    min-height: 18px !important;
                    font-size: 0.75rem !important;
                  }

                  /* Week/Day view specific event styling */
                  .fc-dayGridWeek-view .fc-daygrid-event,
                  .fc-dayGridDay-view .fc-daygrid-event {
                    margin: 6px 0 !important;
                    padding: 8px 12px !important;
                    min-height: 50px !important;
                    display: flex !important;
                    align-items: center !important;
                  }
                `}</style>
                <FullCalendar
                  ref={calendarRef}
                  plugins={[dayGridPlugin, interactionPlugin]}
                  initialView={view}
                  events={calendarEvents}
                  headerToolbar={false}
                  height="auto"
                  eventClick={handleEventClick}
                  firstDay={1}
                  expandRows={true}
                  dayMaxEvents={view === 'dayGridMonth' ? 3 : 12}
                  views={{
                    dayGridMonth: {
                      dayMaxEvents: 3,
                    },
                    dayGridWeek: {
                      dayHeaderFormat: { weekday: 'short', day: 'numeric' },
                      dayMaxEvents: 12,
                      eventMinHeight: 50,
                    },
                    dayGridDay: {
                      dayMaxEvents: 15,
                      eventMinHeight: 50,
                    }
                  }}
                  eventContent={(arg: EventContentArg) => (
                    <div className={cn(
                      "p-2 text-sm font-medium text-white rounded cursor-pointer transition-all duration-200 hover:opacity-90 hover:scale-[1.02]",
                      arg.event.extendedProps.status === 'done' && "line-through opacity-70",
                      view !== 'dayGridMonth' && "min-h-[40px] flex items-center"
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
              isTransitioning && "scale-[0.999]"
            )}>
              <div className="flex items-center justify-between border-b p-4">
                <div className="flex items-center gap-2">
                  <List className="h-5 w-5" />
                  <h2 className="text-lg font-semibold">Projects</h2>
                </div>
                <span className="text-sm text-muted-foreground">{projects.length} projects</span>
              </div>
              <div className="divide-y">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className={cn(
                      "flex items-center justify-between px-4 py-2 transition-colors hover:bg-slate-50",
                      selectedProjectId === project.id && "bg-slate-50"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn(
                        "h-2 w-2 flex-shrink-0 rounded-full",
                        project.status === 'todo' && "bg-slate-400",
                        project.status === 'in-progress' && "bg-blue-400",
                        project.status === 'done' && "bg-green-400"
                      )} />
                      <span className={cn(
                        "font-medium truncate",
                        project.status === 'done' && "line-through text-muted-foreground"
                      )}>
                        {project.title}
                      </span>
                      <Badge variant="secondary" className={cn(
                        "px-2 py-0.5 text-xs",
                        project.priority === 'low' && "bg-green-100 text-green-700",
                        project.priority === 'medium' && "bg-yellow-100 text-yellow-700",
                        project.priority === 'high' && "bg-red-100 text-red-700"
                      )}>
                        {project.priority}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 text-sm text-muted-foreground">
                      <span className={cn(
                        "text-xs",
                        new Date() > new Date(project.due_date) && project.status !== 'done' && "text-red-600 font-medium"
                      )}>
                        Due {format(new Date(project.due_date), 'MMM d')}
                      </span>
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