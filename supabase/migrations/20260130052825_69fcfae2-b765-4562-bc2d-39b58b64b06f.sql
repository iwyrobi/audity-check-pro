-- Create is_super_admin function
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'super_admin'::app_role
  )
$$;

-- Create is_admin_or_super helper function for convenience
CREATE OR REPLACE FUNCTION public.is_admin_or_super(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin'::app_role, 'super_admin'::app_role)
  )
$$;

-- Update departments policies: only super_admin can manage
DROP POLICY IF EXISTS "Admins can manage departments" ON public.departments;
CREATE POLICY "Super admins can manage departments" 
ON public.departments 
FOR ALL 
USING (is_super_admin(auth.uid()));

-- Update user_roles policies: only super_admin can manage roles
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Super admins can manage roles" 
ON public.user_roles 
FOR ALL 
USING (is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Super admins can view all roles" 
ON public.user_roles 
FOR SELECT 
USING (is_super_admin(auth.uid()));

-- Update checklist_templates: admin (dept-scoped) + super_admin can manage
DROP POLICY IF EXISTS "Admins and department heads can manage templates" ON public.checklist_templates;
CREATE POLICY "Admins and super admins can manage templates" 
ON public.checklist_templates 
FOR ALL 
USING (
  is_super_admin(auth.uid()) 
  OR (is_admin(auth.uid()) AND department_id = get_user_department_id(auth.uid()))
);

-- Update profiles: super_admin can update any, admin can update in their dept
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update profiles" 
ON public.profiles 
FOR UPDATE 
USING (
  user_id = auth.uid() 
  OR is_super_admin(auth.uid())
  OR (is_admin(auth.uid()) AND department_id = get_user_department_id(auth.uid()))
);

-- Update profiles view: super_admin sees all
DROP POLICY IF EXISTS "Users can view profiles in their department or admins" ON public.profiles;
CREATE POLICY "Users can view profiles" 
ON public.profiles 
FOR SELECT 
USING (
  is_super_admin(auth.uid()) 
  OR department_id = get_user_department_id(auth.uid()) 
  OR user_id = auth.uid()
);

-- Update inspections: department_head can only UPDATE (read+update), not INSERT/DELETE
DROP POLICY IF EXISTS "Create inspections in own department" ON public.inspections;
CREATE POLICY "Create inspections in own department" 
ON public.inspections 
FOR INSERT 
WITH CHECK (
  is_super_admin(auth.uid()) 
  OR is_admin(auth.uid()) 
  OR (is_department_member(auth.uid(), department_id) AND NOT has_role(auth.uid(), 'department_head'))
);

DROP POLICY IF EXISTS "Update own inspections or department head/admin" ON public.inspections;
CREATE POLICY "Update inspections" 
ON public.inspections 
FOR UPDATE 
USING (
  is_super_admin(auth.uid()) 
  OR is_admin(auth.uid())
  OR created_by = auth.uid() 
  OR is_department_head(auth.uid(), department_id)
);

DROP POLICY IF EXISTS "Delete inspections as admin or department head" ON public.inspections;
CREATE POLICY "Delete inspections" 
ON public.inspections 
FOR DELETE 
USING (
  is_super_admin(auth.uid()) 
  OR (is_admin(auth.uid()) AND department_id = get_user_department_id(auth.uid()))
);

DROP POLICY IF EXISTS "View inspections in department or admin" ON public.inspections;
CREATE POLICY "View inspections" 
ON public.inspections 
FOR SELECT 
USING (
  is_super_admin(auth.uid()) 
  OR department_id = get_user_department_id(auth.uid())
);

-- Update work_orders: department_head can only UPDATE (read+update), not INSERT/DELETE
DROP POLICY IF EXISTS "Create work orders in own department" ON public.work_orders;
CREATE POLICY "Create work orders in own department" 
ON public.work_orders 
FOR INSERT 
WITH CHECK (
  is_super_admin(auth.uid()) 
  OR is_admin(auth.uid())
  OR (is_department_member(auth.uid(), department_id) AND NOT has_role(auth.uid(), 'department_head'))
);

DROP POLICY IF EXISTS "Update work orders as owner, assignee, or head/admin" ON public.work_orders;
CREATE POLICY "Update work orders" 
ON public.work_orders 
FOR UPDATE 
USING (
  is_super_admin(auth.uid()) 
  OR is_admin(auth.uid())
  OR created_by = auth.uid() 
  OR assigned_to = auth.uid() 
  OR is_department_head(auth.uid(), department_id)
);

DROP POLICY IF EXISTS "Delete work orders as admin or department head" ON public.work_orders;
CREATE POLICY "Delete work orders" 
ON public.work_orders 
FOR DELETE 
USING (
  is_super_admin(auth.uid()) 
  OR (is_admin(auth.uid()) AND department_id = get_user_department_id(auth.uid()))
);

DROP POLICY IF EXISTS "View work orders in department or admin" ON public.work_orders;
CREATE POLICY "View work orders" 
ON public.work_orders 
FOR SELECT 
USING (
  is_super_admin(auth.uid()) 
  OR department_id = get_user_department_id(auth.uid())
);