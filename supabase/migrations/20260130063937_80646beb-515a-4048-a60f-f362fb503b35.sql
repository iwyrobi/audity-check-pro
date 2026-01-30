-- Fix WITH CHECK to properly allow creator to reassign departments
-- The issue is that WITH CHECK needs explicit reference
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
  -- Creators and admins can reassign to any department
  is_super_admin(auth.uid())
  OR is_admin(auth.uid())
  OR (work_orders.created_by = auth.uid())
  -- Department members can only update within their own department
  OR (department_id = get_user_department_id(auth.uid()))
  OR is_department_head(auth.uid(), department_id)
);