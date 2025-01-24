export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          nickname: string
          avatar_url: string | null
          subscription: 'free' | 'pro' | 'admin'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          nickname: string
          avatar_url?: string | null
          subscription?: 'free' | 'pro' | 'admin'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          nickname?: string
          avatar_url?: string | null
          subscription?: 'free' | 'pro' | 'admin'
          created_at?: string
          updated_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          title: string
          description: string | null
          status: 'todo' | 'in-progress' | 'done'
          progress: number
          color: string
          due_date: string | null
          created_at: string
          updated_at: string
          created_by: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          status?: 'todo' | 'in-progress' | 'done'
          progress?: number
          color: string
          due_date?: string | null
          created_at?: string
          updated_at?: string
          created_by: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          status?: 'todo' | 'in-progress' | 'done'
          progress?: number
          color?: string
          due_date?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string
        }
      }
      tasks: {
        Row: {
          id: string
          title: string
          description: string | null
          is_completed: boolean
          due_date: string | null
          project_id: string
          assigned_to: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          is_completed?: boolean
          due_date?: string | null
          project_id: string
          assigned_to?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          is_completed?: boolean
          due_date?: string | null
          project_id?: string
          assigned_to?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      project_members: {
        Row: {
          project_id: string
          profile_id: string
          role: 'owner' | 'member'
          created_at: string
        }
        Insert: {
          project_id: string
          profile_id: string
          role: 'owner' | 'member'
          created_at?: string
        }
        Update: {
          project_id?: string
          profile_id?: string
          role?: 'owner' | 'member'
          created_at?: string
        }
      }
      comments: {
        Row: {
          id: string
          content: string
          task_id: string | null
          project_id: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          content: string
          task_id?: string | null
          project_id?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          content?: string
          task_id?: string | null
          project_id?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      project_status: 'todo' | 'in-progress' | 'done'
    }
  }
} 