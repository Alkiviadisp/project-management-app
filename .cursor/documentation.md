# Project Management Application Documentation

## Overview
This is a modern project management application built with Next.js, React, and Supabase. The application features a clean, professional UI using TailwindCSS and various UI components from Radix UI. It's designed to help teams manage projects, tasks, and collaboration effectively.

## Tech Stack
- **Frontend Framework**: Next.js 15.1.5 with React 19
- **Styling**: TailwindCSS with custom UI components
- **Database & Authentication**: Supabase
- **Form Management**: React Hook Form with Zod validation
- **UI Components**: Radix UI primitives
- **Icons**: Lucide React
- **Date Handling**: date-fns
- **Notifications**: Sonner toast notifications

## Core Features

### 1. Navigation & Layout
- Collapsible sidebar with responsive design
- Main navigation includes:
  - Dashboard
  - Projects
  - Tasks
  - Settings
- Active state indicators with blue background
- Mobile-responsive layout

### 2. Dashboard
- Kanban-style board layout
- Three columns: To Do, In Progress, Done
- Project cards with:
  - Progress indicators
  - Color-coded status
  - Project descriptions
  - Quick action buttons
  - Due dates
  - Priority indicators
  - Tags

### 3. Project Management
#### Project Creation
- Comprehensive project form with:
  - Basic Information:
    - Project Title
    - Project Owner
    - Status (Not Started, In Progress, Completed)
    - Priority (Low, Medium, High)
    - Due Date with Calendar Picker
  - Detailed Information:
    - Description
    - Tags (comma-separated)
    - File Attachments with preview
    - Initial Comments
- Form validation using Zod
- File upload functionality to Supabase storage

#### Project Features
- Project status tracking with color coding
- Priority management with visual indicators
- Tag system with custom styling
- File attachment support with preview
- Progress tracking
- Due date management with calendar integration

### 4. Tasks
#### Task Management
- Comprehensive task creation and management
- Task listing with status indicators
- Task features include:
  - Title and description
  - Due date with calendar picker
  - Status tracking (Pending/Completed)
  - Creation and due dates display
  - Quick status toggle
  - Delete functionality

#### Task Creation Form
- Modal-based task creation interface
- Form fields include:
  - Task title with validation
  - Optional description
  - Due date selection with calendar
- Real-time form validation
- Loading states during creation
- Success/error notifications

#### Task List Features
- Visual status indicators
- Due date tracking
- Creation date display
- Hover effects for better UX
- Quick actions menu
- Status toggle with checkbox
- Delete confirmation

## Implementation Details

### Authentication
- Supabase authentication integration
- Protected routes
- User profile management
- Per-user data isolation

### Data Structure
#### Projects Table
- title: string
- description: string
- owner_id: string (foreign key to users)
- status: enum ('todo', 'in-progress', 'done')
- due_date: timestamp
- priority: enum ('low', 'medium', 'high')
- tags: string[]
- attachments: jsonb
- created_at: timestamp
- created_by: string (foreign key to users)

#### Tasks Table
- title: string
- description: string
- due_date: timestamp
- status: enum ('pending', 'completed')
- project_id: string (foreign key to projects)
- created_by: string (foreign key to users)
- created_at: timestamp
- updated_at: timestamp

### Security Policies
#### Row Level Security (RLS)
The application implements Row Level Security in Supabase for data protection:

##### Users Table Policies
```sql
-- Enable RLS
alter table users enable row level security;

-- Users can read their own data
create policy "Enable read access for users"
on users for select
using (auth.uid() = id);

-- Users can update their own data
create policy "Enable update for users"
on users for update
using (auth.uid() = id)
with check (auth.uid() = id);
```

##### Tasks Table Policies
```sql
-- Enable RLS
alter table tasks enable row level security;

-- Insert policy
create policy "Enable insert for authenticated users"
on tasks for insert
with check (
  auth.uid() = created_by
  or
  exists (
    select 1 from projects
    where projects.id = project_id
    and projects.created_by = auth.uid()
  )
);

-- Select policy
create policy "Enable read for authenticated users"
on tasks for select
using (
  auth.uid() = created_by
  or
  exists (
    select 1 from projects
    where projects.id = project_id
    and projects.created_by = auth.uid()
  )
);

-- Update policy
create policy "Enable update for authenticated users"
on tasks for update
using (
  auth.uid() = created_by
  or
  exists (
    select 1 from projects
    where projects.id = project_id
    and projects.created_by = auth.uid()
  )
);

-- Delete policy
create policy "Enable delete for authenticated users"
on tasks for delete
using (
  auth.uid() = created_by
  or
  exists (
    select 1 from projects
    where projects.id = project_id
    and projects.created_by = auth.uid()
  )
);
```

These policies ensure:
- Users can only access their own user data
- Users can create tasks in projects they own
- Users can view tasks they created or tasks in their projects
- Users can update tasks they created or tasks in their projects
- Users can delete tasks they created or tasks in their projects

### UI/UX Features
1. **Form Components**:
   - Custom input fields with validation
   - Calendar date picker with Popover
   - Rich text areas for descriptions
   - Form validation feedback
   - Loading states
   - Success/error notifications

2. **Navigation**:
   - Collapsible sidebar
   - Breadcrumb navigation
   - Active state indicators
   - Mobile-responsive menu
   - Back navigation

3. **Notifications**:
   - Toast notifications for actions
   - Loading states
   - Error handling
   - Success confirmations

### Styling Guidelines
- Blue primary color (#2563eb)
- White backgrounds for content
- Consistent spacing using TailwindCSS utilities
- Responsive design breakpoints
- Shadow and border styling for cards
- Hover and active states
- Color coding for status and priority
- Gradient backgrounds
- Custom calendar styling

## Best Practices
1. **Code Organization**:
   - Component-based architecture
   - Separation of concerns
   - Reusable UI components
   - Type safety with TypeScript
   - Zod schema validation

2. **Performance**:
   - Optimized images
   - Lazy loading
   - Client-side caching
   - Efficient state management
   - Form state management with React Hook Form

3. **Security**:
   - Form validation with Zod
   - Protected routes
   - Data sanitization
   - User-specific data access

4. **Accessibility**:
   - ARIA labels
   - Keyboard navigation
   - Focus management
   - Screen reader support
   - Proper heading hierarchy

## Development Guidelines
1. **Component Creation**:
   - Use functional components
   - Implement proper TypeScript types
   - Follow naming conventions
   - Include proper documentation
   - Use React Hook Form for forms

2. **Styling**:
   - Use TailwindCSS utilities
   - Follow mobile-first approach
   - Maintain consistent spacing
   - Use design system variables
   - Implement proper hover states

3. **State Management**:
   - Use React hooks effectively
   - Implement proper error handling
   - Manage loading states
   - Handle form validation
   - Use Zod for schema validation

4. **Testing**:
   - Write unit tests for components
   - Test form validation
   - Test API integration
   - Test responsive design
   - Test error scenarios

## Deployment
- Vercel deployment recommended
- Environment variables configuration
- Supabase project setup
- Database migrations
- Storage bucket configuration

When making changes to the database always update the schema.sql file and provide the SQL code to run in the Supabase database.