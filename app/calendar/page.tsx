"use client"

import * as React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Calendar as CalendarIcon, List, ChevronLeft, ChevronRight } from "lucide-react"
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
import resourceTimelinePlugin from '@fullcalendar/resource-timeline'
import resourceDayGridPlugin from '@fullcalendar/resource-daygrid'
import { toast } from "sonner"

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

type Task = {
  id: string
  title: string
  status: "todo" | "in-progress" | "done"
  due_date: string
  project_id: string
}

type TaskWithProject = Task & {
  project?: {
    id: string;
    title: string;
    color: string;
  };
};

type CalendarView = 'dayGridMonth' | 'dayGridWeek' | 'dayGridDay'

function CalendarContent() {
  const [projects, setProjects] = React.useState<Project[]>([])
  const [tasks, setTasks] = React.useState<Task[]>([])
  const [view, setView] = React.useState<CalendarView>('dayGridMonth')
  const [selectedProjectId, setSelectedProjectId] = React.useState<string | null>(null)
  const [isViewTransitioning, setIsViewTransitioning] = React.useState(false)
  const sidebar = useSidebar()
  const supabase = createClient()
  const calendarRef = React.useRef<any>(null)
  const portalRef = React.useRef<HTMLDivElement>(null)
  const draggedEventRef = React.useRef<HTMLElement | null>(null)
  const resizeTimeoutRef = React.useRef<NodeJS.Timeout>(null)
  const [isTransitioning, setIsTransitioning] = React.useState(false)
  const [projectColors, setProjectColors] = React.useState(new Map<string, string>())
  const [currentDate, setCurrentDate] = React.useState(() => new Date())

  // Update project colors whenever projects change
  React.useEffect(() => {
    const newProjectColors = new Map<string, string>();
    projects.forEach((project, index) => {
      const color = getEventColor(project.priority, project.status, index);
      newProjectColors.set(project.id, color);
    });
    setProjectColors(newProjectColors);
  }, [projects]);

  // Create portal container
  React.useEffect(() => {
    const portal = document.createElement('div')
    portal.id = 'calendar-drag-portal'
    portal.style.position = 'fixed'
    portal.style.pointerEvents = 'none'
    portal.style.zIndex = '9999'
    document.body.appendChild(portal)
    portalRef.current = portal

    return () => {
      portal.remove()
    }
  }, [])

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

  React.useEffect(() => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi()
      const date = calendarApi.getDate()
      setCurrentDate(date instanceof Date ? date : new Date(date))
    }
  }, [])

  const fetchProjects = async () => {
    try {
      // Fetch projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })

      if (projectsError) throw projectsError

      // Fetch tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false })

      if (tasksError) throw tasksError

      setProjects(projectsData || [])
      setTasks(tasksData || [])
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const getEventColor = (priority: string, status: string, index: number) => {
    // Project colors for timelines
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
    ];

    // Use index to cycle through colors
    return projectColors[index % projectColors.length];
  }

  const handleEventDrop = async (info: any) => {
    try {
      const { event } = info;
      const taskId = event.id;
      
      // Just use the date part without any timezone conversion
      const dateStr = event.startStr.split('T')[0];
      
      // Update single task
      const { error } = await supabase
        .from('tasks')
        .update({ due_date: dateStr })
        .eq('id', taskId);

      if (error) throw error;

      // Refresh tasks after update
      fetchProjects();
      
      toast.success("Task rescheduled", {
        description: `Moved to ${format(new Date(dateStr), 'MMMM d, yyyy')}`
      });
    } catch (error) {
      console.error('Error updating task date:', error);
      info.revert(); // Revert the drag if there's an error
      toast.error("Failed to reschedule task", {
        description: "Please try again"
      });
    }
  }

  const calendarEvents = React.useMemo(() => {
    type CalendarEvent = {
      id: string;
      title: string;
      start: string;
      end: string;
      allDay: boolean;
      backgroundColor: string;
      borderColor: string;
      textColor: string;
      classNames?: string[];
      extendedProps: {
        type: 'task';
        status: string;
        projectId: string;
        taskId: string;
      };
    };

    const events: CalendarEvent[] = [];
    
    // Create individual events for each task
    tasks.filter(task => task.status !== 'done').forEach((task) => {
      if (!task.due_date) return;
      
      // Just use the date part without any timezone conversion
      const dateStr = task.due_date.split('T')[0];
      
      const color = projectColors.get(task.project_id) || '#000000';
      
      events.push({
        id: task.id,
        title: task.title,
        start: dateStr,
        end: dateStr,
        allDay: true,
        backgroundColor: color,
        borderColor: color,
        textColor: 'white',
        classNames: ['task-event'],
        extendedProps: {
          type: 'task',
          status: task.status,
          projectId: task.project_id,
          taskId: task.id
        }
      });
    });

    return events;
  }, [tasks, projectColors]);

  // Create resources from projects
  const resources = projects.map(project => ({
    id: project.id,
    title: project.title
  }));

  const handleEventClick = (info: { event: { id: string; extendedProps: { projectId?: string } } }) => {
    // If clicking a task, select its project
    const projectId = info.event.extendedProps.projectId || info.event.id;
    setSelectedProjectId(projectId.startsWith('title-') ? projectId.replace('title-', '') : projectId);
  }

  const eventContent = (arg: EventContentArg) => {
    const isTask = arg.event.extendedProps.type === 'task';
    const isSelected = selectedProjectId === (isTask ? arg.event.extendedProps.projectId : arg.event.id);
    
    return (
      <div className={cn(
        "flex flex-col gap-1 p-1 transition-all duration-200 h-full w-full relative group",
        isTask ? "text-xs" : "text-sm font-medium"
      )}>
        <div 
          className={cn(
            "px-2 py-1 rounded-full transition-transform duration-300",
            isSelected && "scale-105 transform"
          )}
          style={{
            backgroundColor: arg.event.backgroundColor,
            color: 'white'
          }}
        >
          <span className="truncate block">{arg.event.title}</span>
        </div>
      </div>
    );
  };

  const handlePrevMonth = () => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi()
      calendarApi.prev()
      const date = calendarApi.getDate()
      setCurrentDate(date instanceof Date ? date : new Date(date))
    }
  }

  const handleNextMonth = () => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi()
      calendarApi.next()
      const date = calendarApi.getDate()
      setCurrentDate(date instanceof Date ? date : new Date(date))
    }
  }

  const handleToday = () => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi()
      calendarApi.today()
      const date = calendarApi.getDate()
      setCurrentDate(date instanceof Date ? date : new Date(date))
    }
  }

  return (
    <>
      <AppSidebar className="hidden lg:block" />
      <SidebarInset className="bg-gradient-to-br from-white to-blue-50/20">
        <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center justify-between border-b bg-white px-6">
          {/* Left Section */}
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mx-4 h-6" />
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              <h1 className="text-xl font-semibold">Calendar</h1>
            </div>
          </div>

          {/* Center Section - Month Navigation */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrevMonth}
                className="h-8 w-8 hover:bg-gray-100"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-[160px] text-center">
                <span className="text-lg font-semibold">{format(currentDate, 'MMMM yyyy')}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNextMonth}
                className="h-8 w-8 hover:bg-gray-100"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Right Section - View Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleToday}
              className="h-8"
            >
              Today
            </Button>
            <Separator orientation="vertical" className="h-6" />
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

        <main className="relative flex-1">
          <div className={cn(
            "grid grid-cols-1 gap-6 p-6 transition-all duration-500 ease-in-out will-change-[margin,width]",
            sidebar.state === "expanded" ? "lg:ml-0" : "lg:ml-8"
          )}>
            <div className={cn(
              "rounded-xl border bg-white shadow-sm transition-all duration-500 ease-in-out transform",
              isTransitioning && "scale-[0.999]"
            )}>
              <div className={cn(
                "transition-all duration-300 ease-in-out",
                isViewTransitioning && "opacity-0 scale-98"
              )}>
                <style jsx global>{`
                  /* Calendar Styling */
                  .fc-view-harness {
                    background: white;
                  }

                  /* Make header section sticky */
                  .fc .fc-scrollgrid-section-header {
                    position: sticky;
                    top: 64px;
                    z-index: 40;
                    background: rgb(255 255 255 / 1.0);
                  }

                  .fc .fc-scrollgrid-section-header table {
                    border-bottom: 1px solid #e5e7eb;
                    background: rgb(255 255 255 / 1.0);
                  }

                  .fc .fc-col-header-cell {
                    background: rgb(255 255 255 / 1.0);
                  }

                  .fc-theme-standard .fc-scrollgrid {
                    border: none;
                  }

                  /* Task Event */
                  .task-event {
                    margin: 1px 4px !important;
                    padding: 2px !important;
                    border-radius: 4px !important;
                    border: none !important;
                    background: transparent !important;
                    max-width: 100% !important;
                    overflow: visible !important;
                  }

                  /* Fix for dragging visibility */
                  .fc-event-dragging {
                    position: relative !important;
                    z-index: 1000 !important;
                  }

                  .fc-event-dragging * {
                    visibility: visible !important;
                    opacity: 1 !important;
                  }

                  .fc-daygrid-event-harness {
                    z-index: auto !important;
                  }

                  .fc-daygrid-event-harness-abs {
                    visibility: visible !important;
                    z-index: 1000 !important;
                  }

                  .fc-event.fc-event-dragging {
                    opacity: 1 !important;
                    visibility: visible !important;
                  }

                  /* Helper styles */
                  .fc-helper {
                    z-index: 1000 !important;
                    opacity: 0.8 !important;
                    background: white !important;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1) !important;
                  }

                  .fc-event {
                    cursor: grab !important;
                  }

                  .fc-event:active {
                    cursor: grabbing !important;
                  }

                  /* Portal styles */
                  #calendar-drag-portal {
                    position: fixed;
                    pointer-events: none;
                    z-index: 9999;
                    left: 0;
                    top: 0;
                    width: 100%;
                    height: 100%;
                  }

                  #calendar-drag-portal > * {
                    position: fixed !important;
                    pointer-events: none !important;
                    z-index: 9999 !important;
                    transform-origin: center center !important;
                    transition: transform 0.1s ease !important;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important;
                    background: white !important;
                    border-radius: 4px !important;
                    opacity: 0.9 !important;
                  }
                `}</style>
                <FullCalendar
                  ref={calendarRef}
                  plugins={[dayGridPlugin, interactionPlugin, resourceDayGridPlugin]}
                  initialView={view}
                  initialDate={currentDate}
                  events={calendarEvents}
                  resources={resources}
                  resourceOrder="title"
                  headerToolbar={false}
                  height="auto"
                  eventClick={handleEventClick}
                  firstDay={1}
                  expandRows={true}
                  dayMaxEvents={false}
                  editable={true}
                  droppable={true}
                  eventDrop={handleEventDrop}
                  dragRevertDuration={0}
                  dragScroll={false}
                  eventStartEditable={true}
                  eventDurationEditable={false}
                  eventDragMinDistance={5}
                  displayEventTime={false}
                  eventTimeFormat={{
                    hour: 'numeric',
                    minute: '2-digit',
                    meridiem: 'short'
                  }}
                  eventDragStart={(info) => {
                    const el = info.el as HTMLElement;
                    const clone = el.cloneNode(true) as HTMLElement;
                    const rect = el.getBoundingClientRect();
                    
                    // Style the clone
                    clone.style.position = 'fixed';
                    clone.style.width = `${rect.width}px`;
                    clone.style.height = `${rect.height}px`;
                    clone.style.pointerEvents = 'none';
                    clone.style.zIndex = '9999';
                    clone.style.opacity = '0.9';
                    clone.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                    clone.style.background = 'white';
                    clone.style.borderRadius = '4px';
                    clone.setAttribute('data-portal', 'true');
                    
                    // Position clone at cursor immediately
                    const x = info.jsEvent.clientX - (rect.width / 2);
                    const y = info.jsEvent.clientY - (rect.height / 2);
                    clone.style.transform = `translate3d(${x}px, ${y}px, 0)`;
                    
                    // Add clone to portal
                    if (portalRef.current) {
                      portalRef.current.appendChild(clone);
                      draggedEventRef.current = clone;
                      
                      // Position clone at cursor
                      const handleMouseMove = (e: MouseEvent) => {
                        if (clone) {
                          const x = e.clientX - (rect.width / 2);
                          const y = e.clientY - (rect.height / 2);
                          clone.style.transform = `translate3d(${x}px, ${y}px, 0)`;
                        }
                      };
                      
                      document.addEventListener('mousemove', handleMouseMove);
                      el.dataset.mouseMoveHandler = handleMouseMove.toString();
                    }
                  }}
                  eventDragStop={(info) => {
                    const el = info.el as HTMLElement;
                    
                    // Remove clone and handlers
                    if (draggedEventRef.current) {
                      draggedEventRef.current.remove();
                      draggedEventRef.current = null;
                    }
                    
                    if (el.dataset.mouseMoveHandler) {
                      document.removeEventListener('mousemove', new Function('return ' + el.dataset.mouseMoveHandler)());
                      delete el.dataset.mouseMoveHandler;
                    }
                  }}
                  snapDuration={{ minutes: 1 }}
                  eventConstraint={{
                    startTime: '00:00',
                    endTime: '24:00',
                  }}
                  datesSet={({ start }) => {
                    setCurrentDate(start)
                  }}
                  views={{
                    dayGridMonth: {
                      type: 'dayGridMonth',
                      dayMaxEvents: false,
                    },
                    dayGridWeek: {
                      type: 'dayGridWeek',
                      dayHeaderFormat: { weekday: 'short', day: 'numeric' },
                      dayMaxEvents: false,
                      eventMinHeight: 30,
                    },
                    dayGridDay: {
                      type: 'dayGridDay',
                      dayMaxEvents: false,
                      eventMinHeight: 30,
                    }
                  }}
                  eventContent={eventContent}
                  schedulerLicenseKey="GPL-My-Project-Is-Open-Source"
                  resourceAreaWidth={0}
                  slotMinWidth={0}
                  resourceLabelDidMount={() => {}}
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
                {projects.map((project) => {
                  const projectColor = projectColors.get(project.id) || '#000000';
                  return (
                    <div
                      key={project.id}
                      onClick={() => setSelectedProjectId(project.id)}
                      className={cn(
                        "flex items-center justify-between px-4 py-2 transition-colors cursor-pointer bg-white hover:bg-gray-50",
                        selectedProjectId === project.id && "bg-gray-50"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div 
                          className={cn(
                            "px-3 py-1 rounded-full font-medium truncate",
                            project.status === 'done' && "line-through opacity-70",
                            selectedProjectId === project.id && "shadow-md"
                          )}
                          style={{
                            backgroundColor: projectColor,
                            color: 'white'
                          }}
                        >
                          {project.title}
                        </div>
                        <Badge variant="secondary" className={cn(
                          "px-2 py-0.5 text-xs rounded-full",
                          project.priority === 'low' && "bg-green-100 text-green-700",
                          project.priority === 'medium' && "bg-yellow-100 text-yellow-700",
                          project.priority === 'high' && "bg-red-100 text-red-700"
                        )}>
                          {project.priority}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className={cn(
                          "text-xs text-gray-600",
                          new Date() > new Date(project.due_date) && project.status !== 'done' && "text-red-600 font-bold"
                        )}>
                          Due {format(new Date(project.due_date), 'MMM d')}
                        </span>
                      </div>
                    </div>
                  );
                })}
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