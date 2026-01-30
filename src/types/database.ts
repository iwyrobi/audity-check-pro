export type AppRole = 'admin' | 'department_head' | 'user';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      departments: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          department_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          department_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          department_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          role: AppRole;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role: AppRole;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          role?: AppRole;
          created_at?: string;
        };
      };
      checklist_templates: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          department_id: string | null;
          items: Json;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          department_id?: string | null;
          items: Json;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          department_id?: string | null;
          items?: Json;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      inspections: {
        Row: {
          id: string;
          template_id: string;
          inspector_id: string;
          department_id: string | null;
          status: 'pending' | 'in_progress' | 'completed';
          started_at: string | null;
          completed_at: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          template_id: string;
          inspector_id: string;
          department_id?: string | null;
          status?: 'pending' | 'in_progress' | 'completed';
          started_at?: string | null;
          completed_at?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          template_id?: string;
          inspector_id?: string;
          department_id?: string | null;
          status?: 'pending' | 'in_progress' | 'completed';
          started_at?: string | null;
          completed_at?: string | null;
          notes?: string | null;
          created_at?: string;
        };
      };
      inspection_answers: {
        Row: {
          id: string;
          inspection_id: string;
          item_id: string;
          answer: Json;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          inspection_id: string;
          item_id: string;
          answer: Json;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          inspection_id?: string;
          item_id?: string;
          answer?: Json;
          notes?: string | null;
          created_at?: string;
        };
      };
      work_orders: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          department_id: string | null;
          assigned_to: string | null;
          created_by: string;
          status: 'open' | 'in_progress' | 'completed' | 'cancelled';
          priority: 'low' | 'medium' | 'high' | 'critical';
          due_date: string | null;
          inspection_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          department_id?: string | null;
          assigned_to?: string | null;
          created_by: string;
          status?: 'open' | 'in_progress' | 'completed' | 'cancelled';
          priority?: 'low' | 'medium' | 'high' | 'critical';
          due_date?: string | null;
          inspection_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          department_id?: string | null;
          assigned_to?: string | null;
          created_by?: string;
          status?: 'open' | 'in_progress' | 'completed' | 'cancelled';
          priority?: 'low' | 'medium' | 'high' | 'critical';
          due_date?: string | null;
          inspection_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Functions: {
      has_role: {
        Args: {
          _user_id: string;
          _role: AppRole;
        };
        Returns: boolean;
      };
      get_user_department: {
        Args: {
          _user_id: string;
        };
        Returns: string | null;
      };
    };
    Enums: {
      app_role: AppRole;
    };
  };
}

// Helper types for easier use
export type Department = Database['public']['Tables']['departments']['Row'];
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type UserRole = Database['public']['Tables']['user_roles']['Row'];
export type ChecklistTemplate = Database['public']['Tables']['checklist_templates']['Row'];
export type Inspection = Database['public']['Tables']['inspections']['Row'];
export type InspectionAnswer = Database['public']['Tables']['inspection_answers']['Row'];
export type WorkOrder = Database['public']['Tables']['work_orders']['Row'];
