-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'department_head', 'user');

-- Create departments table
CREATE TABLE public.departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create checklist_templates table
CREATE TABLE public.checklist_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create template_sections table
CREATE TABLE public.template_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES public.checklist_templates(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create template_questions table
CREATE TABLE public.template_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id UUID REFERENCES public.template_sections(id) ON DELETE CASCADE NOT NULL,
  question TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'yes-no',
  score INTEGER NOT NULL DEFAULT 1,
  options JSONB,
  required BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create inspections table
CREATE TABLE public.inspections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES public.checklist_templates(id) ON DELETE SET NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'in-progress',
  total_score INTEGER DEFAULT 0,
  max_score INTEGER DEFAULT 0,
  percentage NUMERIC(5,2) DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create inspection_answers table
CREATE TABLE public.inspection_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inspection_id UUID REFERENCES public.inspections(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES public.template_questions(id) ON DELETE SET NULL,
  question_text TEXT NOT NULL,
  answer TEXT,
  score_earned INTEGER DEFAULT 0,
  max_score INTEGER DEFAULT 1,
  is_defect BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create work_orders table
CREATE TABLE public.work_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  linked_inspection_id UUID REFERENCES public.inspections(id) ON DELETE SET NULL,
  linked_defect_question TEXT,
  due_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create work_order_comments table
CREATE TABLE public.work_order_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  work_order_id UUID REFERENCES public.work_orders(id) ON DELETE CASCADE NOT NULL,
  comment TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create media table for file uploads
CREATE TABLE public.media (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  associated_type TEXT NOT NULL,
  associated_id UUID NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;

-- Helper function: Check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin'
  )
$$;

-- Helper function: Check if user has specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Helper function: Get user's department
CREATE OR REPLACE FUNCTION public.get_user_department_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT department_id FROM public.profiles WHERE user_id = _user_id
$$;

-- Helper function: Check if user is member of department
CREATE OR REPLACE FUNCTION public.is_department_member(_user_id UUID, _department_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id AND department_id = _department_id
  )
$$;

-- Helper function: Check if user is department head of specific department
CREATE OR REPLACE FUNCTION public.is_department_head(_user_id UUID, _department_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.user_roles r ON p.user_id = r.user_id
    WHERE p.user_id = _user_id 
      AND p.department_id = _department_id 
      AND r.role = 'department_head'
  )
$$;

-- RLS Policies for departments
CREATE POLICY "Anyone can view departments" ON public.departments FOR SELECT USING (true);
CREATE POLICY "Admins can manage departments" ON public.departments FOR ALL USING (public.is_admin(auth.uid()));

-- RLS Policies for profiles
CREATE POLICY "Users can view profiles in their department or admins" ON public.profiles
  FOR SELECT USING (
    public.is_admin(auth.uid()) 
    OR department_id = public.get_user_department_id(auth.uid())
    OR user_id = auth.uid()
  );
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- RLS Policies for user_roles
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (user_id = auth.uid());

-- RLS Policies for checklist_templates
CREATE POLICY "View templates in own department or admin" ON public.checklist_templates
  FOR SELECT USING (
    public.is_admin(auth.uid()) 
    OR department_id = public.get_user_department_id(auth.uid())
  );
CREATE POLICY "Admins and department heads can manage templates" ON public.checklist_templates
  FOR ALL USING (
    public.is_admin(auth.uid()) 
    OR public.is_department_head(auth.uid(), department_id)
  );

-- RLS Policies for template_sections
CREATE POLICY "View sections via template access" ON public.template_sections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.checklist_templates t 
      WHERE t.id = template_id 
      AND (public.is_admin(auth.uid()) OR t.department_id = public.get_user_department_id(auth.uid()))
    )
  );
CREATE POLICY "Manage sections via template access" ON public.template_sections
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.checklist_templates t 
      WHERE t.id = template_id 
      AND (public.is_admin(auth.uid()) OR public.is_department_head(auth.uid(), t.department_id))
    )
  );

-- RLS Policies for template_questions
CREATE POLICY "View questions via section access" ON public.template_questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.template_sections s
      JOIN public.checklist_templates t ON s.template_id = t.id
      WHERE s.id = section_id 
      AND (public.is_admin(auth.uid()) OR t.department_id = public.get_user_department_id(auth.uid()))
    )
  );
CREATE POLICY "Manage questions via section access" ON public.template_questions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.template_sections s
      JOIN public.checklist_templates t ON s.template_id = t.id
      WHERE s.id = section_id 
      AND (public.is_admin(auth.uid()) OR public.is_department_head(auth.uid(), t.department_id))
    )
  );

-- RLS Policies for inspections
CREATE POLICY "View inspections in department or admin" ON public.inspections
  FOR SELECT USING (
    public.is_admin(auth.uid()) 
    OR department_id = public.get_user_department_id(auth.uid())
  );
CREATE POLICY "Create inspections in own department" ON public.inspections
  FOR INSERT WITH CHECK (
    public.is_admin(auth.uid()) 
    OR department_id = public.get_user_department_id(auth.uid())
  );
CREATE POLICY "Update own inspections or department head/admin" ON public.inspections
  FOR UPDATE USING (
    public.is_admin(auth.uid()) 
    OR created_by = auth.uid() 
    OR public.is_department_head(auth.uid(), department_id)
  );
CREATE POLICY "Delete inspections as admin or department head" ON public.inspections
  FOR DELETE USING (
    public.is_admin(auth.uid()) 
    OR public.is_department_head(auth.uid(), department_id)
  );

-- RLS Policies for inspection_answers
CREATE POLICY "View answers via inspection access" ON public.inspection_answers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.inspections i
      WHERE i.id = inspection_id 
      AND (public.is_admin(auth.uid()) OR i.department_id = public.get_user_department_id(auth.uid()))
    )
  );
CREATE POLICY "Manage answers via inspection access" ON public.inspection_answers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.inspections i
      WHERE i.id = inspection_id 
      AND (public.is_admin(auth.uid()) OR i.created_by = auth.uid() OR public.is_department_head(auth.uid(), i.department_id))
    )
  );

-- RLS Policies for work_orders
CREATE POLICY "View work orders in department or admin" ON public.work_orders
  FOR SELECT USING (
    public.is_admin(auth.uid()) 
    OR department_id = public.get_user_department_id(auth.uid())
  );
CREATE POLICY "Create work orders in own department" ON public.work_orders
  FOR INSERT WITH CHECK (
    public.is_admin(auth.uid()) 
    OR department_id = public.get_user_department_id(auth.uid())
  );
CREATE POLICY "Update work orders as owner, assignee, or head/admin" ON public.work_orders
  FOR UPDATE USING (
    public.is_admin(auth.uid()) 
    OR created_by = auth.uid() 
    OR assigned_to = auth.uid()
    OR public.is_department_head(auth.uid(), department_id)
  );
CREATE POLICY "Delete work orders as admin or department head" ON public.work_orders
  FOR DELETE USING (
    public.is_admin(auth.uid()) 
    OR public.is_department_head(auth.uid(), department_id)
  );

-- RLS Policies for work_order_comments
CREATE POLICY "View comments via work order access" ON public.work_order_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.work_orders w
      WHERE w.id = work_order_id 
      AND (public.is_admin(auth.uid()) OR w.department_id = public.get_user_department_id(auth.uid()))
    )
  );
CREATE POLICY "Create comments in accessible work orders" ON public.work_order_comments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.work_orders w
      WHERE w.id = work_order_id 
      AND (public.is_admin(auth.uid()) OR w.department_id = public.get_user_department_id(auth.uid()))
    )
  );

-- RLS Policies for media
CREATE POLICY "View media for accessible items" ON public.media
  FOR SELECT USING (
    public.is_admin(auth.uid())
    OR uploaded_by = auth.uid()
    OR (associated_type = 'inspection' AND EXISTS (
      SELECT 1 FROM public.inspections i WHERE i.id = associated_id 
      AND i.department_id = public.get_user_department_id(auth.uid())
    ))
    OR (associated_type = 'work_order' AND EXISTS (
      SELECT 1 FROM public.work_orders w WHERE w.id = associated_id 
      AND w.department_id = public.get_user_department_id(auth.uid())
    ))
  );
CREATE POLICY "Upload media to accessible items" ON public.media
  FOR INSERT WITH CHECK (
    uploaded_by = auth.uid()
    AND (
      public.is_admin(auth.uid())
      OR (associated_type = 'inspection' AND EXISTS (
        SELECT 1 FROM public.inspections i WHERE i.id = associated_id 
        AND i.department_id = public.get_user_department_id(auth.uid())
      ))
      OR (associated_type = 'work_order' AND EXISTS (
        SELECT 1 FROM public.work_orders w WHERE w.id = associated_id 
        AND w.department_id = public.get_user_department_id(auth.uid())
      ))
    )
  );

-- Create storage bucket for uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('uploads', 'uploads', true);

-- Storage policies
CREATE POLICY "Authenticated users can upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'uploads' AND auth.role() = 'authenticated');
CREATE POLICY "Anyone can view uploads" ON storage.objects
  FOR SELECT USING (bucket_id = 'uploads');
CREATE POLICY "Users can delete own uploads" ON storage.objects
  FOR DELETE USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create trigger for auto-creating profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_checklist_templates_updated_at BEFORE UPDATE ON public.checklist_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_inspections_updated_at BEFORE UPDATE ON public.inspections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_work_orders_updated_at BEFORE UPDATE ON public.work_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default departments
INSERT INTO public.departments (name, description) VALUES
  ('Security', 'Security and surveillance operations'),
  ('Engineering', 'Engineering and maintenance operations'),
  ('Operations', 'General operations and logistics'),
  ('Safety', 'Health and safety compliance');