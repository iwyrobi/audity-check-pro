
-- Add assigned_to column to checklist_templates
ALTER TABLE public.checklist_templates 
ADD COLUMN assigned_to uuid DEFAULT NULL;

-- Update RLS: assigned users can also view their assigned templates
DROP POLICY IF EXISTS "View templates in own department or admin" ON public.checklist_templates;
CREATE POLICY "View templates in own department or admin" 
ON public.checklist_templates 
FOR SELECT 
USING (
  is_super_admin(auth.uid()) 
  OR (is_admin(auth.uid()) AND department_id IN (SELECT get_department_descendants(get_user_department_id(auth.uid()))))
  OR department_id = get_user_department_id(auth.uid())
  OR assigned_to = auth.uid()
);
