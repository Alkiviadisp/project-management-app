import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import { ListTodo } from "lucide-react"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

export default function TasksPage() {
  return (
    <SidebarProvider>
      <AppSidebar className="hidden lg:block" />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <div className="flex items-center gap-2">
              <ListTodo className="h-5 w-5" />
              <h1 className="text-xl font-semibold">Tasks</h1>
            </div>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="space-y-4">
            <div className="rounded-xl border bg-card p-4 shadow">
              <h2 className="text-lg font-semibold">Task 1</h2>
              <p className="text-sm text-muted-foreground">Task description goes here</p>
            </div>
            <div className="rounded-xl border bg-card p-4 shadow">
              <h2 className="text-lg font-semibold">Task 2</h2>
              <p className="text-sm text-muted-foreground">Task description goes here</p>
            </div>
            <div className="rounded-xl border bg-card p-4 shadow">
              <h2 className="text-lg font-semibold">Task 3</h2>
              <p className="text-sm text-muted-foreground">Task description goes here</p>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
} 