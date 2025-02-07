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
import resourceTimelinePlugin from '@fullcalendar/resource-timeline'
import resourceDayGridPlugin from '@fullcalendar/resource-daygrid'

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
  const resizeTimeoutRef = React.useRef<NodeJS.Timeout>()
  const [isTransitioning, setIsTransitioning] = React.useState(false)
  const [projectColors, setProjectColors] = React.useState(new Map<string, string>())

  // Update project colors whenever projects change
  React.useEffect(() => {
    const newProjectColors = new Map<string, string>();
    projects.forEach((project, index) => {
      const color = getEventColor(project.priority, project.status, index);
      newProjectColors.set(project.id, color);
    });
    setProjectColors(newProjectColors);
  }, [projects]);

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

  const calendarEvents = React.useMemo(() => {
    type CalendarEvent = {
      id: string;
      title: string;
      start: Date;
      end: Date;
      backgroundColor: string;
      borderColor: string;
      textColor: string;
      classNames?: string[];
      extendedProps: {
        type: 'task';
        status: string;
        projectId: string;
        tasks?: { id: string; title: string; status: string }[];
        totalTasks?: number;
      };
    };

    const events: CalendarEvent[] = [];
    const tasksByDate = new Map<string, Map<string, Task[]>>();

    // Group tasks by date and project, excluding done tasks
    tasks.filter(task => task.status !== 'done').forEach((task) => {
      if (!task.due_date) return;
      const dateKey = task.due_date.split('T')[0];
      
      if (!tasksByDate.has(dateKey)) {
        tasksByDate.set(dateKey, new Map());
      }
      
      const projectTasks = tasksByDate.get(dateKey)!;
      if (!projectTasks.has(task.project_id)) {
        projectTasks.set(task.project_id, []);
      }
      
      projectTasks.get(task.project_id)!.push(task);
    });

    // Create events for each project's tasks on each date
    tasksByDate.forEach((projectTasks, dateKey) => {
      projectTasks.forEach((tasks, projectId) => {
        const color = projectColors.get(projectId) || '#000000';
        const visibleTasks = tasks.slice(0, 2);
        const remainingCount = Math.max(0, tasks.length - 2);
        
        events.push({
          id: `tasks-${projectId}-${dateKey}`,
          title: visibleTasks.map(t => t.title).join(' • ') + (remainingCount > 0 ? ` (+${remainingCount} more)` : ''),
          start: new Date(dateKey),
          end: new Date(dateKey),
          backgroundColor: color,
          borderColor: color,
          textColor: 'white',
          classNames: ['task-event'],
          extendedProps: {
            type: 'task',
            status: tasks[0].status,
            projectId: projectId,
            tasks: tasks,
            totalTasks: tasks.length
          }
        });
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
    const tasks = arg.event.extendedProps.tasks || [];
    const visibleTasks = tasks.slice(0, 2);
    const remainingTasks = tasks.slice(2);
    const remainingCount = remainingTasks.length;
    
    return (
      <div className={cn(
        "flex flex-col gap-1 p-1 transition-all duration-200 h-full w-full relative group",
        isTask ? "text-xs" : "text-sm font-medium"
      )}>
        {visibleTasks.map((task) => (
          <div 
            key={task.id}
            className={cn(
              "px-2 py-1 rounded-full transition-transform duration-300",
              isSelected && "scale-105 transform"
            )}
            style={{
              backgroundColor: arg.event.backgroundColor,
              color: 'white'
            }}
          >
            <span className="truncate block">{task.title}</span>
          </div>
        ))}

        {/* More tasks indicator and dropdown */}
        {remainingCount > 0 && (
          <div className="relative">
            <div 
              className={cn(
                "px-2 py-0.5 text-center text-xs cursor-pointer",
                "text-gray-600 hover:text-gray-900"
              )}
            >
              +{remainingCount} more
            </div>
            {/* Dropdown */}
            <div className="absolute left-0 top-full mt-1 w-full max-w-[250px] bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50 invisible group-hover:visible">
              {remainingTasks.map((task) => (
                <div
                  key={task.id}
                  className="px-2 py-1 mx-2 my-1 rounded-full text-sm"
                  style={{
                    backgroundColor: arg.event.backgroundColor,
                    color: 'white'
                  }}
                >
                  {task.title}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <AppSidebar className="hidden lg:block" />
      <SidebarInset className="bg-gradient-to-br from-white to-blue-50/20">
        <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center justify-between border-b bg-white px-6">
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

                  /* Increase spacing between days */
                  .fc .fc-scrollgrid-section > td {
                    border-width: 4px !important;
                    border-color: white !important;
                  }

                  .fc-theme-standard td, .fc-theme-standard th {
                    border-width: 4px !important;
                    border-color: white !important;
                  }

                  .fc .fc-daygrid-day {
                    padding: 2px !important;
                  }

                  /* Make header section sticky */
                  .fc .fc-scrollgrid-section-header {
                    position: sticky;
                    top: 64px; /* height of the header */
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
                    margin: 1px 4px;
                    padding: 2px;
                    border-radius: 4px;
                    border: none !important;
                    background: transparent !important;
                    max-width: 100% !important;
                    overflow: visible !important;
                    z-index: 1;
                  }

                  .task-event:hover {
                    z-index: 10;
                  }

                  .fc-event {
                    background: none;
                    border: none;
                    max-width: 100%;
                  }

                  .fc-event-main {
                    padding: 0;
                    max-width: 100%;
                  }

                  .fc-event-main-frame {
                    height: 100%;
                    max-width: 100%;
                  }

                  /* Calendar Layout */
                  .fc-dayGridMonth-view .fc-daygrid-day {
                    height: auto !important;
                    min-height: 120px !important;
                  }

                  .fc-dayGridMonth-view .fc-daygrid-day-frame {
                    min-height: 100% !important;
                  }

                  .fc-daygrid-event-harness {
                    margin: 2px 0 !important;
                  }

                  .fc-daygrid-day-events {
                    padding: 2px !important;
                  }

                  /* Improve day header appearance */
                  .fc .fc-daygrid-day-top {
                    flex-direction: row;
                    padding: 4px;
                  }

                  .fc .fc-daygrid-day-number {
                    font-weight: 500;
                  }

                  /* Add shadow to sticky header */
                  .fc .fc-scrollgrid-section-header {
                    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
                  }

                  /* Fix scrolling container */
                  .fc-scroller {
                    overflow: visible !important;
                    height: auto !important;
                  }

                  .fc-scroller-liquid-absolute {
                    position: static !important;
                    top: auto !important;
                    left: auto !important;
                    right: auto !important;
                    bottom: auto !important;
                  }
                `}</style>
                <FullCalendar
                  ref={calendarRef}
                  plugins={[dayGridPlugin, interactionPlugin, resourceDayGridPlugin]}
                  initialView={view}
                  events={calendarEvents}
                  resources={resources}
                  resourceOrder="title"
                  headerToolbar={false}
                  height="auto"
                  eventClick={handleEventClick}
                  firstDay={1}
                  expandRows={true}
                  dayMaxEvents={false}
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