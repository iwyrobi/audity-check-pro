-- Update RLS policy to allow department members to update/complete work orders assigned to their department
DROP POLICY IF EXISTS "Update work orders" ON work_orders;

CREATE POLICY "Update work orders" ON work_orders
FOR UPDATE
USING (
  is_super_admin(auth.uid()) 
  OR is_admin(auth.uid()) 
  OR (created_by = auth.uid()) 
  OR is_department_member(auth.uid(), department_id)
  OR is_department_head(auth.uid(), department_id)
);