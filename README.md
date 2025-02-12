# Project Management App

A modern, full-stack project management application built with Next.js 14, Supabase, and TailwindCSS. This application provides a comprehensive solution for managing projects, tasks, and team collaboration with a beautiful, responsive interface.

## 🌟 Features

### Authentication & User Management
- Secure authentication with Supabase Auth
- User profiles with avatars and customizable settings
- Role-based access control

### Projects
- Create and manage projects with rich details
- Set priorities (low, medium, high)
- Track project status (todo, in-progress, done)
- Add custom tags and color coding
- Upload project attachments and cover images
- Collaborative project spaces

### Tasks
- Comprehensive task management within projects
- Task assignments and due dates
- Status tracking with Kanban-style board
- Task comments and discussions
- Drag-and-drop task organization
- Due date reminders

### Calendar & Planning
- Interactive calendar view (FullCalendar integration)
- Resource timeline
- Event scheduling and management
- Multiple calendar views (day, week, month)

### Dashboard
- Real-time project statistics
- Task distribution charts
- Progress tracking
- Team activity overview

## 🛠 Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **UI Components**: 
  - TailwindCSS for styling
  - Shadcn UI components
  - Radix UI primitives
- **State Management**: React Hooks & Context API
- **Forms**: React Hook Form with Zod validation
- **Data Visualization**: Recharts
- **Calendar**: FullCalendar
- **Drag & Drop**: DND Kit
- **Notifications**: Sonner, React Hot Toast

### Backend & Database
- **Backend**: Supabase
  - PostgreSQL database
  - Row Level Security (RLS)
  - Real-time subscriptions
  - Storage for files and avatars
- **Authentication**: Supabase Auth
- **API**: Next.js API routes with Supabase client

## 🚀 Getting Started

### Prerequisites
- Node.js 20.x or later
- npm or yarn
- Supabase account

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/project-management-app.git
   cd project-management-app
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Set up environment variables
   Create a `.env.local` file with:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Initialize Supabase
   - Create a new Supabase project
   - Run the SQL schema from `schema.sql`
   - Set up storage buckets for avatars and project attachments

5. Start the development server
   ```bash
   npm run dev
   ```

### Docker Deployment

1. Build the Docker image
   ```bash
   docker build -t project-management-app .
   ```

2. Run with Docker Compose
   ```bash
   docker-compose up -d
   ```

## 📦 Project Structure

```
project-management-app/
├── app/                    # Next.js 14 app directory
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Dashboard views
│   ├── projects/          # Project management
│   ├── tasks/             # Task management
│   └── calendar/          # Calendar views
├── components/            # Reusable React components
│   ├── ui/               # UI components
│   ├── forms/            # Form components
│   └── charts/           # Data visualization
├── lib/                   # Utility functions
├── hooks/                # Custom React hooks
├── public/               # Static assets
└── supabase/             # Supabase configuration
```

## 🗄️ Database Schema

The application uses a PostgreSQL database with the following main tables:

- `profiles`: User profiles and settings
- `projects`: Project details and metadata
- `tasks`: Task information and assignments
- `project_members`: Project membership and permissions
- `comments`: Task comments and discussions

Detailed schema available in `schema.sql`

## 🔒 Security

- Row Level Security (RLS) policies for data protection
- Secure file uploads with mime-type validation
- Protected API routes
- Authenticated Supabase client
- Environment variable protection

## 🚀 Deployment

### Vercel Deployment
1. Push your code to GitHub
2. Import project to Vercel
3. Configure environment variables
4. Deploy

### Docker Deployment
The application includes Docker configuration for containerized deployment:
- Multi-stage build process
- Node.js 20 base image
- Production-optimized configuration

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📫 Support

For support, email your-email@example.com or open an issue in the repository.
