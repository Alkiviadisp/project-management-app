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

-- Create profiles table
create table if not exists profiles (
    id uuid references auth.users on delete cascade primary key,
    nickname text not null,
    avatar_url text,
    subscription subscription_type default 'free' not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create projects table
create table if not exists projects (
    id uuid default uuid_generate_v4() primary key,
    title text not null,
    description text,
    created_by uuid references profiles(id) on delete cascade not null,
    status project_status default 'todo'::project_status,
    due_date timestamptz,
    priority text check (priority in ('low', 'medium', 'high')),
    tags text[] default array[]::text[],
    attachments jsonb default '[]'::jsonb,
    color text,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    constraint proper_title check (char_length(title) >= 3)
);

-- Create tasks table
create table if not exists tasks (
    id uuid default uuid_generate_v4() primary key,
    title text not null,
    description text,
    status project_status default 'todo'::project_status not null,
    due_date timestamptz,
    project_id uuid references projects(id) on delete cascade not null,
    assigned_to uuid references profiles(id) on delete set null,
    created_by uuid references profiles(id) on delete cascade not null,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    constraint proper_title check (char_length(title) >= 3)
);

-- Create project_members table
create table if not exists project_members (
    project_id uuid references projects(id) on delete cascade,
    profile_id uuid references profiles(id) on delete cascade,
    created_at timestamptz default now(),
    primary key (project_id, profile_id)
);

-- Create comments table
create table if not exists comments (
    id uuid default uuid_generate_v4() primary key,
    content text not null,
    task_id uuid references tasks(id) on delete cascade not null,
    created_by uuid references profiles(id) on delete cascade not null,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    constraint proper_content check (char_length(content) >= 1)
);

-- Enable Row Level Security
alter table profiles enable row level security;
alter table projects enable row level security;
alter table tasks enable row level security;
alter table project_members enable row level security;
alter table comments enable row level security;

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

    -- 2. Allow authenticated users to upload avatars
    CREATE POLICY "Allow authenticated users to upload avatars"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'avatars' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

    -- 3. Allow authenticated users to update their avatars
    CREATE POLICY "Allow users to update own avatars"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'avatars' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

    -- 4. Allow authenticated users to delete their avatars
    CREATE POLICY "Allow users to delete own avatars"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'avatars' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

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

-- Create storage bucket for project attachments
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
  'project-attachments',
  'project-attachments',
  true,
  false,
  10485760,  -- 10MB limit
  '{
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
    "text/plain",
    "text/csv",
    "application/json",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.oasis.opendocument.text",
    "application/vnd.oasis.opendocument.spreadsheet",
    "application/vnd.oasis.opendocument.presentation",
    "application/zip",
    "application/x-zip-compressed",
    "application/octet-stream"
  }'
) ON CONFLICT (id) DO UPDATE SET allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Drop existing storage policies if they exist
DROP POLICY IF EXISTS "Give users authenticated access to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Give public access to view files" ON storage.objects;

-- Create new storage policies
CREATE POLICY "Allow authenticated users to upload project files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'project-attachments' AND
  (
    (storage.foldername(name))[1] = 'files' OR 
    (storage.foldername(name))[1] = 'covers'
  ) AND
  (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "Allow authenticated users to delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'project-attachments' AND
  (
    (storage.foldername(name))[1] = 'files' OR 
    (storage.foldername(name))[1] = 'covers'
  ) AND
  (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "Allow public to view project files"
ON storage.objects FOR SELECT
USING (bucket_id = 'project-attachments');

-- Enable RLS
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
COMMENT ON COLUMN public.projects.id IS 'Unique identifier for the project';
COMMENT ON COLUMN public.projects.created_at IS 'Timestamp when the project was created';
COMMENT ON COLUMN public.projects.title IS 'Project title';
COMMENT ON COLUMN public.projects.description IS 'Project description';
COMMENT ON COLUMN public.projects.status IS 'Project status (todo, in-progress, done)';
COMMENT ON COLUMN public.projects.due_date IS 'Project due date';
COMMENT ON COLUMN public.projects.priority IS 'Project priority (low, medium, high)';
COMMENT ON COLUMN public.projects.tags IS 'Array of project tags';
COMMENT ON COLUMN public.projects.attachments IS 'Array of project attachments with structure: {url: string, name: string, type: string, size: number, path: string}';
COMMENT ON COLUMN public.projects.color IS 'Project card color';
COMMENT ON COLUMN public.projects.created_by IS 'User ID who created the project';
COMMENT ON COLUMN public.projects.owner IS 'Project owner name';

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';

-- Create function to update task status
CREATE OR REPLACE FUNCTION update_task_status(
  p_task_id UUID,
  p_user_id UUID,
  p_status TEXT
)
RETURNS VOID AS $$
BEGIN
  UPDATE tasks
  SET 
    status = p_status::project_status,
    updated_at = NOW()
  WHERE 
    id = p_task_id 
    AND created_by = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 