import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BadgeCheck, Calendar, FolderKanban, LayoutDashboard, ListTodo, Users, ChevronRight } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Hero Section */}
      <div className="relative">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50" />
        
        {/* Content */}
        <div className="relative">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex min-h-screen flex-col items-center justify-center py-20 text-center">
              {/* Main Content */}
              <div className="relative space-y-8">
                {/* Heading */}
                <div className="space-y-4 animate-fade-in-up">
                  <h1 className="text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl lg:text-8xl">
                    <span className="text-gray-900">
                      Project Management
                    </span>
                    <br />
                    <span className="mt-2 block text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-blue-600">
                      for the modern teams
                    </span>
                  </h1>
                  <p className="mx-auto mt-6 max-w-2xl text-lg sm:text-xl text-gray-600">
                    Streamline your workflow, collaborate seamlessly, and deliver projects on time.
                    The all-in-one solution designed for today's fast-paced teams.
                  </p>
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row justify-center gap-4 animate-fade-in-up [animation-delay:200ms]">
                  <Button
                    asChild
                    size="lg"
                    className="group h-14 px-8 bg-gray-900 hover:bg-gray-800 text-base shadow-xl hover:shadow-2xl transition-all duration-200"
                  >
                    <Link href="/signup">
                      Get Started
                      <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="h-14 px-8 border-2 text-base hover:bg-gray-900 hover:text-white transition-colors duration-200"
                  >
                    <Link href="/login">View Demo</Link>
                  </Button>
                </div>

                {/* Feature Grid */}
                <div className="mt-20 grid grid-cols-2 gap-8 sm:grid-cols-4">
                  {[
                    { icon: LayoutDashboard, label: "Real-time Dashboard", color: "bg-blue-500" },
                    { icon: FolderKanban, label: "Project Management", color: "bg-purple-500" },
                    { icon: ListTodo, label: "Task Tracking", color: "bg-pink-500" },
                    { icon: Calendar, label: "Calendar View", color: "bg-indigo-500" },
                  ].map((feature) => (
                    <div
                      key={feature.label}
                      className="group relative"
                    >
                      <div className="relative flex flex-col items-center rounded-lg border border-gray-200 bg-white p-6 transition duration-200 hover:shadow-lg">
                        <div className={`mb-3 rounded-xl ${feature.color} p-3 text-white`}>
                          <feature.icon className="h-6 w-6" />
                        </div>
                        <div className="text-sm font-medium text-gray-900">{feature.label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="mx-auto w-full max-w-7xl px-4 py-20">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need to manage projects
          </h2>
          <p className="mt-4 text-lg text-gray-500">
            Powerful features to help you and your team succeed
          </p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {/* Feature Cards */}
          <div className="group rounded-xl border bg-white p-8 transition-all hover:shadow-lg">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 transition-transform group-hover:scale-110">
              <LayoutDashboard className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">Real-time Dashboard</h3>
            <p className="mt-2 text-gray-500">
              Get a bird's eye view of your projects with real-time statistics and progress tracking.
            </p>
          </div>

          <div className="group rounded-xl border bg-white p-8 transition-all hover:shadow-lg">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 transition-transform group-hover:scale-110">
              <FolderKanban className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">Project Management</h3>
            <p className="mt-2 text-gray-500">
              Create, organize, and track projects with customizable workflows and priorities.
            </p>
          </div>

          <div className="group rounded-xl border bg-white p-8 transition-all hover:shadow-lg">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 transition-transform group-hover:scale-110">
              <ListTodo className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">Task Tracking</h3>
            <p className="mt-2 text-gray-500">
              Manage tasks with an intuitive Kanban board, assignments, and due dates.
            </p>
          </div>

          <div className="group rounded-xl border bg-white p-8 transition-all hover:shadow-lg">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-100 transition-transform group-hover:scale-110">
              <Calendar className="h-6 w-6 text-yellow-600" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">Calendar View</h3>
            <p className="mt-2 text-gray-500">
              Plan and visualize project timelines with an interactive calendar interface.
            </p>
          </div>

          <div className="group rounded-xl border bg-white p-8 transition-all hover:shadow-lg">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-100 transition-transform group-hover:scale-110">
              <Users className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">Team Collaboration</h3>
            <p className="mt-2 text-gray-500">
              Work together seamlessly with real-time updates and team member assignments.
            </p>
          </div>

          <div className="group rounded-xl border bg-white p-8 transition-all hover:shadow-lg">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-100 transition-transform group-hover:scale-110">
              <BadgeCheck className="h-6 w-6 text-indigo-600" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">Progress Tracking</h3>
            <p className="mt-2 text-gray-500">
              Monitor project progress with visual charts and detailed analytics.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="border-t bg-white">
        <div className="mx-auto max-w-7xl px-4 py-20 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to get started?
          </h2>
          <p className="mt-4 text-lg text-gray-500">
            Join thousands of teams already using our platform to manage their projects effectively.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button
              asChild
              size="lg"
              className="h-12 gap-2 bg-gradient-to-r from-blue-600 to-blue-500 text-base hover:from-blue-700 hover:to-blue-600"
            >
              <Link href="/signup">Start Free Trial</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-12 border-blue-200 text-base hover:bg-blue-50"
            >
              <Link href="/login">Sign In</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Add this to your globals.css
// @keyframes float {
//   0%, 100% { transform: translateY(0); }
//   50% { transform: translateY(-10px); }
// }

// @keyframes float-delayed {
//   0%, 100% { transform: translateY(0); }
//   50% { transform: translateY(-10px); }
// }

// @keyframes fade-in {
//   from { opacity: 0; }
//   to { opacity: 1; }
// }

// @keyframes fade-in-up {
//   from {
//     opacity: 0;
//     transform: translateY(20px);
//   }
//   to {
//     opacity: 1;
//     transform: translateY(0);
//   }
// }

// .animate-float {
//   animation: float 3s ease-in-out infinite;
// }

// .animate-float-delayed {
//   animation: float-delayed 3s ease-in-out infinite;
//   animation-delay: 1.5s;
// }

// .animate-fade-in {
//   animation: fade-in 1s ease-out;
// }

// .animate-fade-in-up {
//   animation: fade-in-up 1s ease-out;
// }


