import { LayoutDashboard, FolderKanban, ListTodo, Settings, Calendar } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSidebar } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

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
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
]

export function NavPages() {
  const pathname = usePathname()
  const sidebar = useSidebar()

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
      </div>
    </div>
  )
} 