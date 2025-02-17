import { LayoutDashboard, FolderKanban, ListTodo, Calendar, Plus, Clock } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSidebar } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"
import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"

type RecentProject = {
  id: string
  title: string
  created_at: string
}

const pages = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Projects",
    url: "/projects",
    icon: FolderKanban,
  },
  {
    title: "Tasks",
    url: "/tasks",
    icon: ListTodo,
  },
  {
    title: "Calendar",
    url: "/calendar",
    icon: Calendar,
  },
]

export function NavPages() {
  const pathname = usePathname()
  const sidebar = useSidebar()
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([])

  useEffect(() => {
    const fetchRecentProjects = async () => {
      const supabase = createClient()
      const { data: projects, error } = await supabase
        .from('projects')
        .select('id, title, created_at')
        .order('created_at', { ascending: false })
        .limit(5)

      if (!error && projects) {
        setRecentProjects(projects)
      }
    }

    fetchRecentProjects()
  }, [])

  return (
    <div className="flex flex-col">
      <div className="px-2">
        <h2 className="mb-2 px-2 text-lg font-semibold tracking-tight data-[state=collapsed]:hidden" data-state={sidebar.state}>Project Management</h2>
        <nav className="space-y-1">
          {pages.map((page) => {
            const Icon = page.icon
            const isActive = pathname === page.url
            return (
              <Tooltip key={page.url} delayDuration={0}>
                <TooltipTrigger asChild>
                  <Link
                    href={page.url}
                    className={cn(
                      "flex h-9 items-center rounded-lg px-2",
                      isActive ? "bg-blue-600 text-white" : "hover:bg-accent",
                      "data-[state=collapsed]:justify-center data-[state=collapsed]:w-9",
                      "data-[state=expanded]:w-full data-[state=expanded]:justify-start",
                    )}
                    data-state={sidebar.state}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className={cn("ml-2", sidebar.state === "collapsed" ? "hidden" : "block")}>
                      {page.title}
                    </span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="hidden data-[state=collapsed]:block">
                  {page.title}
                </TooltipContent>
              </Tooltip>
            )
          })}
        </nav>
        <div className="mt-3">
          <hr className="border-t border-[hsl(240,5%,26%)]" />
        </div>
        <div className="mt-3">
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Link
                href="/projects/new"
                className={cn(
                  "flex h-9 w-full items-center rounded-lg px-2",
                  "hover:bg-accent text-muted-foreground hover:text-foreground",
                  "data-[state=collapsed]:justify-center data-[state=collapsed]:w-9",
                  "data-[state=expanded]:w-full data-[state=expanded]:justify-start",
                )}
                data-state={sidebar.state}
              >
                <Plus className="h-4 w-4 shrink-0" />
                <span className={cn("ml-2", sidebar.state === "collapsed" ? "hidden" : "block")}>
                  Create New Project
                </span>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" className="hidden data-[state=collapsed]:block">
              Create New Project
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Recent Projects Section */}
        <div className="mt-3 data-[state=collapsed]:hidden" data-state={sidebar.state}>
          <div className="px-2 mb-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="text-foreground underline decoration-[hsl(240,5%,26%)]">Recent Projects</span>
            </div>
          </div>
          <nav className="space-y-1 mt-2">
            {recentProjects.map((project) => (
              <Tooltip key={project.id} delayDuration={0}>
                <TooltipTrigger asChild>
                  <Link
                    href={`/projects/${project.id}`}
                    className={cn(
                      "flex h-9 w-full items-center rounded-lg px-2 text-sm",
                      pathname === `/projects/${project.id}` ? "bg-blue-600 text-white" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                      "data-[state=collapsed]:justify-center data-[state=collapsed]:w-9",
                      "data-[state=expanded]:w-full data-[state=expanded]:justify-start",
                      "transition-colors duration-200"
                    )}
                    data-state={sidebar.state}
                  >
                    <FolderKanban className={cn(
                      "h-4 w-4 shrink-0",
                      pathname === `/projects/${project.id}` ? "text-white" : "text-blue-600/50"
                    )} />
                    <span className={cn("ml-2 truncate", sidebar.state === "collapsed" ? "hidden" : "block")}>
                      {project.title}
                    </span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="hidden data-[state=collapsed]:block">
                  {project.title}
                </TooltipContent>
              </Tooltip>
            ))}
          </nav>
        </div>
      </div>
    </div>
  )
} 