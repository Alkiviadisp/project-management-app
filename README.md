# Project Management App

A modern project and task management application built with Next.js, Supabase, and TailwindCSS.

## Overview

Project Management App is designed to help you create, manage, and track projects and tasks efficiently. This full-featured application leverages the power of Next.js for server-side rendering, Supabase for backend services (PostgreSQL database, authentication, and file storage), and TailwindCSS combined with Shadcn UI for a modern, responsive design.

## Features

### Projects
- Create and manage projects with titles, descriptions, and due dates
- Assign priority levels (low, medium, high) and statuses (todo, in-progress, done)
- Add tags for better organization
- Upload and manage project attachments and cover images
- Edit project details with inline editing and dropdown file selection
- Color-coded project cards for quick visual identification

### Tasks
- Create, edit, and delete tasks within projects
- Set due dates and provide descriptions for tasks
- Track task status with visual indicators
- Sort tasks by due date and group them in a Kanban-style layout
- Quick actions on hover including edit, delete, and status toggling

### Dashboard & UI
- Overview of project and task statistics with interactive UI components
- Visual representation of task distribution with smooth transitions and hover effects
- Responsive design optimized for both desktop and mobile devices

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TailwindCSS, Shadcn UI
- **Backend**: Supabase (PostgreSQL, Storage, and Auth)
- **Forms & Validation**: React Hook Form, Zod
- **Date Handling**: date-fns
- **Icons**: Lucide Icons
- **State Management**: React Hooks, Context API

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/en/) (v14 or later)
- [npm](https://www.npmjs.com/)

### Installation

1. **Clone the Repository**

   ```bash
   git clone https://github.com/yourusername/project-management-app.git
   cd project-management-app
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

3. **Setup Environment Variables**

   Create a `.env.local` file in the project root and add the following:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run the Development Server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Environment Variables

Ensure you have the following environment variables configured in your `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Database Schema

All database schema changes are managed in a single file: **schema.sql**. The previous add_due_date.sql file is no longer used.

### Projects Table

```sql
projects (
  id uuid primary key,
  title text not null,
  description text,
  status text not null,
  due_date timestamp with time zone,
  priority text not null,
  tags text[],
  attachments jsonb default '[]'::jsonb,
  color text,
  created_by uuid references auth.users,
  created_at timestamp with time zone default now()
)
```

### Tasks Table

```sql
tasks (
  id uuid primary key,
  title text not null,
  description text,
  status text not null,
  due_date timestamp with time zone,
  project_id uuid references projects,
  created_by uuid references auth.users,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
)
```

## Application Structure

The codebase is structured as follows:

- **app/**: Contains Next.js pages using the new App Router, including project listing, project details, and task management pages.
- **components/**: Reusable UI components such as buttons, forms, modals, sidebars, and file inputs.
- **lib/**: Utility functions and Supabase client setup.
- **public/**: Static assets and images.
- **schema.sql**: The consolidated file that defines the entire database schema and related triggers, functions, and policies.

## Deployment

The easiest way to deploy this application is using the [Vercel Platform](https://vercel.com/new). Vercel seamlessly integrates with Next.js and offers top performance.

For manual deployment, follow these steps:

1. Push your changes to your GitHub repository.
2. Connect your repository on Vercel.
3. Ensure your environment variables are set in Vercel's dashboard.
4. Deploy your application.

For more details, refer to the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying).

## Contributing

Contributions are welcome! To contribute:

1. Fork the repository.
2. Create a new branch for your feature or bug fix.
3. Commit your changes using clear, descriptive commit messages.
4. Push to your fork and submit a pull request.

Please ensure that your work follows our coding guidelines, including using TailwindCSS for styling and maintaining consistent code style.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contact

For questions, suggestions, or feedback, feel free to open an issue or contact us at [your.email@example.com](mailto:your.email@example.com).

---

Happy project managing!
