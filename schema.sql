-- Enable necessary extensions
create extension if not exists "uuid-ossp";

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
    id uuid references auth.users on delete cascade not null primary key,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    nickname text not null,
    avatar_url text,
    subscription subscription_type default 'free'::subscription_type,
    constraint proper_nickname check (char_length(nickname) >= 3)
);

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

-- Set up storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Storage policies
DO $$
BEGIN
    -- Create policies if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND policyname = 'Anyone can view avatars'
    ) THEN
        CREATE POLICY "Anyone can view avatars"
        ON storage.objects FOR SELECT
        USING (bucket_id = 'avatars');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND policyname = 'Anyone can upload avatars'
    ) THEN
        CREATE POLICY "Anyone can upload avatars"
        ON storage.objects FOR INSERT
        WITH CHECK (bucket_id = 'avatars');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND policyname = 'Users can update their own avatars'
    ) THEN
        CREATE POLICY "Users can update their own avatars"
        ON storage.objects FOR UPDATE
        USING (bucket_id = 'avatars' AND auth.uid()::text = owner);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND policyname = 'Users can delete their own avatars'
    ) THEN
        CREATE POLICY "Users can delete their own avatars"
        ON storage.objects FOR DELETE
        USING (bucket_id = 'avatars' AND auth.uid()::text = owner);
    END IF;
END$$;

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Set up RLS policies
DO $$
BEGIN
    -- Profiles policies
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND policyname = 'Public profiles are viewable by everyone'
    ) THEN
        CREATE POLICY "Public profiles are viewable by everyone"
        ON profiles FOR SELECT
        USING (true);
    END IF;

    -- Allow profile creation during sign-up
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND policyname = 'Users can insert their own profile'
    ) THEN
        CREATE POLICY "Users can insert their own profile"
        ON profiles FOR INSERT
        WITH CHECK (
            -- Allow insert if the ID exists in auth.users
            EXISTS (
                SELECT 1
                FROM auth.users
                WHERE id = profiles.id
            )
        );
    END IF;

    -- Allow users to update their own profile
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND policyname = 'Users can update own profile'
    ) THEN
        CREATE POLICY "Users can update own profile"
        ON profiles FOR UPDATE
        USING (auth.uid() = id);
    END IF;

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