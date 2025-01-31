# Project Management App

A modern project and task management application built with Next.js, Supabase, and TailwindCSS.

## Features

### Projects
- Create and manage projects with titles, descriptions, and due dates
- Assign priority levels (low, medium, high)
- Add tags for better organization
- Upload and manage project attachments
- Track project status (todo, in-progress, done)
- Edit project details with inline editing
- Modern UI with hover effects and smooth transitions

### Tasks
- Create and manage tasks within projects
- Track task status (todo, in-progress, done)
- Set due dates for better time management
- Add descriptions for detailed task information
- Sort tasks by due date (most urgent first)
- Edit task details through a modal dialog
- Visual status indicators with color coding
- Quick actions on hover (edit, delete)
- Group tasks by status in Kanban-style columns

### Dashboard
- Overview of project and task statistics
- Visual representation of task distribution
- Quick access to active projects
- Progress tracking with completion percentages

## Tech Stack

- **Frontend**: Next.js 14 with App Router
- **Styling**: TailwindCSS + Shadcn UI
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **File Storage**: Supabase Storage
- **State Management**: React Hooks + Context
- **Forms**: React Hook Form + Zod
- **Date Handling**: date-fns
- **Icons**: Lucide Icons

## Getting Started

First, set up your environment variables:

```bash
cp .env.example .env.local
```

Then, install dependencies and run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Environment Variables

Create a `.env.local` file with the following variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Database Schema

### Projects Table
```sql
projects (
  id uuid primary key
  title text not null
  description text
  status text not null
  due_date timestamp with time zone
  priority text not null
  tags text[]
  attachments jsonb[]
  color text
  created_by uuid references auth.users
  created_at timestamp with time zone default now()
)
```

### Tasks Table
```sql
tasks (
  id uuid primary key
  title text not null
  description text
  status text not null
  due_date timestamp with time zone
  project_id uuid references projects
  created_by uuid references auth.users
  created_at timestamp with time zone default now()
  updated_at timestamp with time zone default now()
)
```

## Recent Updates

- Added task sorting by due date
- Implemented task editing functionality in both project and tasks pages
- Added visual indicators for task status
- Improved UI/UX with hover effects and transitions
- Added project owner display and management
- Enhanced task management with Kanban-style layout

## License

MIT License - feel free to use this project for your own purposes.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
