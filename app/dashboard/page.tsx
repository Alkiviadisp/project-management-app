import { AppSidebar } from "@/components/app-sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { LayoutDashboard, Plus, Clock, ArrowRight, CheckCircle2 } from "lucide-react"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

// This is sample data - replace with your actual data fetching logic
const projects = [
  {
    id: 1,
    title: "E-commerce Platform",
    description: "Building a modern e-commerce platform with Next.js",
    status: "todo",
    dueDate: "2024-03-01",
    progress: 0,
  },
  {
    id: 2,
    title: "Mobile App Design",
    description: "UI/UX design for iOS and Android application",
    status: "in-progress",
    dueDate: "2024-02-15",
    progress: 60,
  },
  {
    id: 3,
    title: "API Integration",
    description: "Integrate third-party APIs for payment processing",
    status: "done",
    dueDate: "2024-01-30",
    progress: 100,
  },
  // Add more sample projects as needed
]

export default function DashboardPage() {
  const todoProjects = projects.filter(p => p.status === "todo")
  const inProgressProjects = projects.filter(p => p.status === "in-progress")
  const doneProjects = projects.filter(p => p.status === "done")

  return (
    <SidebarProvider>
      <AppSidebar className="hidden lg:block" />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex w-full items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <div className="flex items-center gap-2">
                <LayoutDashboard className="h-5 w-5" />
                <h1 className="text-xl font-semibold">Dashboard</h1>
              </div>
            </div>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Project
            </Button>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-6 p-6 pt-2">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
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
                    <Card key={project.id} className="group bg-white transition-all hover:shadow-md">
                      <CardHeader className="p-4">
                        <div className="flex items-start justify-between">
                          <h3 className="font-semibold">{project.title}</h3>
                          <Badge variant="outline">0%</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <p className="text-sm text-muted-foreground">{project.description}</p>
                      </CardContent>
                      <CardFooter className="p-4 pt-0">
                        <Button variant="ghost" size="sm" className="ml-auto gap-2 opacity-0 group-hover:opacity-100">
                          View Details
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
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
                    <Card key={project.id} className="group bg-white transition-all hover:shadow-md">
                      <CardHeader className="p-4">
                        <div className="flex items-start justify-between">
                          <h3 className="font-semibold">{project.title}</h3>
                          <Badge variant="outline">{project.progress}%</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <p className="text-sm text-muted-foreground">{project.description}</p>
                      </CardContent>
                      <CardFooter className="p-4 pt-0">
                        <Button variant="ghost" size="sm" className="ml-auto gap-2 opacity-0 group-hover:opacity-100">
                          View Details
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
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
                    <Card key={project.id} className="group bg-white transition-all hover:shadow-md">
                      <CardHeader className="p-4">
                        <div className="flex items-start justify-between">
                          <h3 className="font-semibold">{project.title}</h3>
                          <Badge variant="outline">100%</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <p className="text-sm text-muted-foreground">{project.description}</p>
                      </CardContent>
                      <CardFooter className="p-4 pt-0">
                        <Button variant="ghost" size="sm" className="ml-auto gap-2 opacity-0 group-hover:opacity-100">
                          View Details
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
