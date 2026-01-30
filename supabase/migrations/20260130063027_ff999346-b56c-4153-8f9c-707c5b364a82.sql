-- Update RLS policy to allow department members to reassign work orders
-- Users can update if they're a member of the CURRENT department (before update)
DROP POLICY IF EXISTS "Update work orders" ON work_orders;

CREATE POLICY "Update work orders" ON work_orders
FOR UPDATE
USING (
  is_super_admin(auth.uid()) 
  OR is_admin(auth.uid()) 
  OR (created_by = auth.uid()) 
  OR is_department_member(auth.uid(), department_id)
  OR is_department_head(auth.uid(), department_id)
)
WITH CHECK (
  is_super_admin(auth.uid()) 
  OR is_admin(auth.uid()) 
  OR (created_by = auth.uid()) 
  OR is_department_member(auth.uid(), department_id)
  OR is_department_head(auth.uid(), department_id)
  OR true  -- Allow the new row if USING passed (user had permission on original row)
);