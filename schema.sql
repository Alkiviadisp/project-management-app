-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_status') THEN
        create type project_status as enum ('todo', 'in-progress', 'done');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_type') THEN
        create type subscription_type as enum ('free', 'pro', 'admin');
    END IF;
END$$;

-- Create tables
create table if not exists profiles (
    id uuid references auth.users on delete cascade primary key,
    nickname text not null,
    avatar_url text,
    subscription subscription_type default 'free' not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS)
alter table profiles enable row level security;

create policy "Public profiles are viewable by everyone"
on profiles for select
using (true);

create policy "Users can insert their own profile"
on profiles for insert
with check (auth.uid() = id);

create policy "Users can update their own profile"
on profiles for update
using (auth.uid() = id);

-- Set up storage
DO $$
BEGIN
    -- Ensure the avatars bucket exists and is public
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('avatars', 'avatars', true)
    ON CONFLICT (id) DO UPDATE SET public = true;

    -- Drop existing storage policies if they exist
    DROP POLICY IF EXISTS "Anyone can upload avatars" ON storage.objects;
    DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
    DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
    DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
    DROP POLICY IF EXISTS "Give public access to avatars" ON storage.objects;
    DROP POLICY IF EXISTS "Allow authenticated users to upload avatars" ON storage.objects;
    DROP POLICY IF EXISTS "Allow users to update own avatar" ON storage.objects;
    DROP POLICY IF EXISTS "Allow users to delete own avatar" ON storage.objects;
    
    -- Create new storage policies
    
    -- 1. Public read access for avatars
    CREATE POLICY "Give public access to avatars"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');

    -- 2. Allow anyone to upload avatars during sign-up
    CREATE POLICY "Allow avatar uploads"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'avatars');

    -- 3. Allow authenticated users to update their avatars
    CREATE POLICY "Allow users to update avatars"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'avatars');

    -- 4. Allow authenticated users to delete their avatars
    CREATE POLICY "Allow users to delete avatars"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'avatars');

END $$;

-- Handle updated_at using triggers
create or replace function handle_updated_at()
returns trigger as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$ language plpgsql;

create trigger handle_profiles_updated_at
    before update on profiles
    for each row
    execute function handle_updated_at();

-- Create function to handle new user profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, nickname, avatar_url)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'nickname', 'user_' || substr(new.id::text, 1, 8)),
        COALESCE(new.raw_user_meta_data->>'avatar_url', null)
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user profiles
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

create table if not exists projects (
    id uuid default uuid_generate_v4() primary key,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    title text not null,
    description text,
    created_by uuid references profiles(id) on delete cascade not null,
    status project_status default 'todo'::project_status,
    constraint proper_title check (char_length(title) >= 3)
);

create table if not exists tasks (
    id uuid default uuid_generate_v4() primary key,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    title text not null,
    description text,
    project_id uuid references projects(id) on delete cascade not null,
    assignee_id uuid references profiles(id) on delete set null,
    status project_status default 'todo'::project_status,
    constraint proper_title check (char_length(title) >= 3)
);

create table if not exists project_members (
    project_id uuid references projects(id) on delete cascade,
    profile_id uuid references profiles(id) on delete cascade,
    created_at timestamptz default now(),
    primary key (project_id, profile_id)
);

create table if not exists comments (
    id uuid default uuid_generate_v4() primary key,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    content text not null,
    task_id uuid references tasks(id) on delete cascade not null,
    created_by uuid references profiles(id) on delete cascade not null,
    constraint proper_content check (char_length(content) >= 1)
);

-- Enable Row Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Set up RLS policies
DO $$
BEGIN
    -- Projects policies
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'projects' 
        AND policyname = 'Project members can view projects'
    ) THEN
        CREATE POLICY "Project members can view projects"
        ON projects FOR SELECT
        USING (
            auth.uid() IN (
                SELECT profile_id
                FROM project_members
                WHERE project_id = id
            )
            OR auth.uid() = created_by
        );
    END IF;

    -- Add policies for project creation
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'projects' 
        AND policyname = 'Users can create projects'
    ) THEN
        CREATE POLICY "Users can create projects"
        ON projects FOR INSERT
        WITH CHECK (auth.uid() IS NOT NULL);
    END IF;

    -- Add policies for project updates
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'projects' 
        AND policyname = 'Project members can update projects'
    ) THEN
        CREATE POLICY "Project members can update projects"
        ON projects FOR UPDATE
        USING (
            auth.uid() IN (
                SELECT profile_id
                FROM project_members
                WHERE project_id = id
            )
            OR auth.uid() = created_by
        );
    END IF;

    -- Add policy for project deletion
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'projects' 
        AND policyname = 'Only owner can delete projects'
    ) THEN
        CREATE POLICY "Only owner can delete projects"
        ON projects FOR DELETE
        USING (auth.uid() = created_by);
    END IF;

    -- Tasks policies
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'tasks' 
        AND policyname = 'Project members can view tasks'
    ) THEN
        CREATE POLICY "Project members can view tasks"
        ON tasks FOR SELECT
        USING (
            auth.uid() IN (
                SELECT profile_id
                FROM project_members
                WHERE project_id = tasks.project_id
            )
            OR auth.uid() = (
                SELECT created_by
                FROM projects
                WHERE id = tasks.project_id
            )
        );
    END IF;

    -- Add policy for task creation
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'tasks' 
        AND policyname = 'Project members can create tasks'
    ) THEN
        CREATE POLICY "Project members can create tasks"
        ON tasks FOR INSERT
        WITH CHECK (auth.uid() IS NOT NULL);
    END IF;

    -- Add policy for task updates
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'tasks' 
        AND policyname = 'Project members can update tasks'
    ) THEN
        CREATE POLICY "Project members can update tasks"
        ON tasks FOR UPDATE
        USING (
            auth.uid() IN (
                SELECT profile_id
                FROM project_members
                WHERE project_id = project_id
            )
            OR auth.uid() = (
                SELECT created_by
                FROM projects
                WHERE id = project_id
            )
        );
    END IF;

    -- Comments policies
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'comments' 
        AND policyname = 'Project members can view comments'
    ) THEN
        CREATE POLICY "Project members can view comments"
        ON comments FOR SELECT
        USING (
            auth.uid() IN (
                SELECT profile_id
                FROM project_members pm
                JOIN tasks t ON t.project_id = pm.project_id
                WHERE t.id = comments.task_id
            )
            OR auth.uid() = (
                SELECT p.created_by
                FROM tasks t
                JOIN projects p ON p.id = t.project_id
                WHERE t.id = comments.task_id
            )
        );
    END IF;

    -- Add policy for comment creation
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'comments' 
        AND policyname = 'Project members can create comments'
    ) THEN
        CREATE POLICY "Project members can create comments"
        ON comments FOR INSERT
        WITH CHECK (auth.uid() IS NOT NULL);
    END IF;

    -- Add policy for comment updates
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'comments' 
        AND policyname = 'Authors can update their comments'
    ) THEN
        CREATE POLICY "Authors can update their comments"
        ON comments FOR UPDATE
        USING (auth.uid() = created_by);
    END IF;

    -- Add policy for comment deletion
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'comments' 
        AND policyname = 'Authors can delete their comments'
    ) THEN
        CREATE POLICY "Authors can delete their comments"
        ON comments FOR DELETE
        USING (auth.uid() = created_by);
    END IF;
END$$;

-- Final schema cache refresh
NOTIFY pgrst, 'reload schema';

-- Create necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tables
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('not_started', 'in_progress', 'completed')),
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  attachments JSONB DEFAULT '[]'::jsonb,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create storage bucket for project attachments
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
  'project-attachments',
  'project-attachments',
  true,
  false,
  10485760,  -- 10MB limit
  '{image/jpeg,image/png,image/gif,image/webp}'
) ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS projects_owner_id_idx ON public.projects(created_by);
CREATE INDEX IF NOT EXISTS projects_created_at_idx ON public.projects(created_at DESC);

-- Create functions for handling timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to handle deleted project attachments
CREATE OR REPLACE FUNCTION public.handle_deleted_project()
RETURNS TRIGGER AS $$
DECLARE
  attachment JSONB;
BEGIN
  -- Loop through attachments and delete files from storage
  FOR attachment IN SELECT * FROM jsonb_array_elements(OLD.attachments)
  LOOP
    -- Delete the file from storage
    DELETE FROM storage.objects
    WHERE bucket_id = 'project-attachments'
    AND name = (attachment->>'path');
  END LOOP;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS set_users_updated_at ON public.users;
CREATE TRIGGER set_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_projects_updated_at ON public.projects;
CREATE TRIGGER set_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS cleanup_project_attachments ON public.projects;
CREATE TRIGGER cleanup_project_attachments
  BEFORE DELETE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_deleted_project();

-- Set up RLS policies

-- Users policies
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Projects policies
CREATE POLICY "Users can view own projects" ON public.projects
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can create own projects" ON public.projects
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own projects" ON public.projects
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own projects" ON public.projects
  FOR DELETE USING (auth.uid() = created_by);

-- Storage policies
CREATE POLICY "Give users authenticated access to own folder" ON storage.objects
  FOR ALL USING (
    auth.role() = 'authenticated' AND
    (bucket_id = 'project-attachments' AND auth.uid()::text = (storage.foldername(name))[1])
  );

CREATE POLICY "Give public access to view files" ON storage.objects
  FOR SELECT USING (bucket_id = 'project-attachments');

-- Add comments for documentation
COMMENT ON TABLE public.projects IS 'Stores project information';
COMMENT ON COLUMN public.projects.attachments IS 'Array of file attachments with structure: [{url: string, name: string, type: string, size: number, path: string}]';
COMMENT ON COLUMN public.projects.color IS 'Tailwind CSS color class for the project card'; 