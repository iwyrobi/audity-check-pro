-- Update work_orders UPDATE policy to restrict admins to their department
DROP POLICY IF EXISTS "Update work orders" ON public.work_orders;

CREATE POLICY "Update work orders" 
ON public.work_orders 
FOR UPDATE 
USING (
  is_super_admin(auth.uid()) 
  OR (is_admin(auth.uid()) AND department_id IN (SELECT get_department_descendants(get_user_department_id(auth.uid()))))
  OR (created_by = auth.uid()) 
  OR (department_id IN (SELECT get_department_descendants(get_user_department_id(auth.uid()))))
)
WITH CHECK (
  is_super_admin(auth.uid()) 
  OR (is_admin(auth.uid()) AND department_id IN (SELECT get_department_descendants(get_user_department_id(auth.uid()))))
  OR (created_by = auth.uid()) 
  OR (department_id IN (SELECT get_department_descendants(get_user_department_id(auth.uid()))))
);

-- Update work_orders INSERT policy to restrict admins to their department
DROP POLICY IF EXISTS "Create work orders in own department" ON public.work_orders;

CREATE POLICY "Create work orders in own department" 
ON public.work_orders 
FOR INSERT 
WITH CHECK (
  is_super_admin(auth.uid()) 
  OR (is_admin(auth.uid()) AND department_id IN (SELECT get_department_descendants(get_user_department_id(auth.uid()))))
  OR (is_department_member(auth.uid(), department_id) AND NOT has_role(auth.uid(), 'department_head'::app_role))
);

-- Update checklist_templates VIEW policy to use department descendants for admins
DROP POLICY IF EXISTS "View templates in own department or admin" ON public.checklist_templates;

CREATE POLICY "View templates in own department or admin" 
ON public.checklist_templates 
FOR SELECT 
USING (
  is_super_admin(auth.uid())
  OR (is_admin(auth.uid()) AND department_id IN (SELECT get_department_descendants(get_user_department_id(auth.uid()))))
  OR (department_id = get_user_department_id(auth.uid()))
);

-- Update checklist_templates MANAGE policy to use department descendants for admins
DROP POLICY IF EXISTS "Admins and super admins can manage templates" ON public.checklist_templates;

CREATE POLICY "Admins and super admins can manage templates" 
ON public.checklist_templates 
FOR ALL 
USING (
  is_super_admin(auth.uid()) 
  OR (is_admin(auth.uid()) AND department_id IN (SELECT get_department_descendants(get_user_department_id(auth.uid()))))
);