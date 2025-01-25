import { AppSidebar } from "@/components/app-sidebar"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { FolderKanban, Plus } from "lucide-react"
import Link from "next/link"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

export default function ProjectsPage() {
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
                <FolderKanban className="h-5 w-5" />
                <h1 className="text-xl font-semibold">Projects</h1>
              </div>
            </div>
            <Button asChild className="gap-2">
              <Link href="/projects/new">
                <Plus className="h-4 w-4" />
                Add Project
              </Link>
            </Button>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border bg-card p-6 shadow">
              <h2 className="text-lg font-semibold">Project 1</h2>
              <p className="text-sm text-muted-foreground">Project description goes here</p>
            </div>
            <div className="rounded-xl border bg-card p-6 shadow">
              <h2 className="text-lg font-semibold">Project 2</h2>
              <p className="text-sm text-muted-foreground">Project description goes here</p>
            </div>
            <div className="rounded-xl border bg-card p-6 shadow">
              <h2 className="text-lg font-semibold">Project 3</h2>
              <p className="text-sm text-muted-foreground">Project description goes here</p>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
} 