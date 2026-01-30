-- Fix RLS policy for work order updates with proper security
-- The USING clause validates the user can access the ORIGINAL row
-- The WITH CHECK clause should allow the update as long as USING passed
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