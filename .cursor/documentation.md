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

### 3. Project Management
#### Project Creation
- Comprehensive project form with:
  - Basic Information:
    - Project Title
    - Project Owner
    - Status (Not Started, In Progress, Completed)
    - Priority (Low, Medium, High)
    - Due Date
  - Detailed Information:
    - Description
    - Tags (comma-separated)
    - File Attachments
    - Initial Comments
- Form validation using Zod
- File upload functionality to Supabase storage

#### Project Features
- Project status tracking
- Priority management
- Tag system
- File attachment support
- Comments/Notes system
- Progress tracking

### 4. Tasks
- Task listing and management
- Task status tracking
- Task descriptions
- Connection to projects

## Implementation Details

### Authentication
- Supabase authentication integration
- Protected routes
- User profile management

### Data Structure
- Projects table with fields:
  - title
  - description
  - owner_id
  - status
  - due_date
  - priority
  - tags
  - attachments
  - comments

### UI/UX Features
1. **Form Components**:
   - Custom input fields
   - Date picker
   - File upload with preview
   - Tag input with badge display
   - Rich text areas
   - Validation feedback

2. **Navigation**:
   - Collapsible sidebar
   - Breadcrumb navigation
   - Active state indicators
   - Mobile-responsive menu

3. **Notifications**:
   - Toast notifications for actions
   - Loading states
   - Error handling

### Styling Guidelines
- Blue primary color (#2563eb)
- White backgrounds for content
- Consistent spacing using TailwindCSS utilities
- Responsive design breakpoints
- Shadow and border styling for cards
- Hover and active states

## Best Practices
1. **Code Organization**:
   - Component-based architecture
   - Separation of concerns
   - Reusable UI components
   - Type safety with TypeScript

2. **Performance**:
   - Optimized images
   - Lazy loading
   - Client-side caching
   - Efficient state management

3. **Security**:
   - Form validation
   - Protected routes
   - Secure file uploads
   - Data sanitization

4. **Accessibility**:
   - ARIA labels
   - Keyboard navigation
   - Focus management
   - Screen reader support

## Development Guidelines
1. **Component Creation**:
   - Use functional components
   - Implement proper TypeScript types
   - Follow naming conventions
   - Include proper documentation

2. **Styling**:
   - Use TailwindCSS utilities
   - Follow mobile-first approach
   - Maintain consistent spacing
   - Use design system variables

3. **State Management**:
   - Use React hooks effectively
   - Implement proper error handling
   - Manage loading states
   - Handle form validation

4. **Testing**:
   - Write unit tests for components
   - Test form validation
   - Test API integration
   - Test responsive design

## Deployment
- Vercel deployment recommended
- Environment variables configuration
- Supabase project setup
- Database migrations
- Storage bucket configuration


when you make changes to the database always update the schema.sql file and give me the sql code to run it to the supabase database.