-- Fix INSERT policy: Allow super_admin, admin, and user roles to create WOs in ANY department
-- department_head is read-only (no INSERT)
DROP POLICY IF EXISTS "Create work orders in own department" ON public.work_orders;

CREATE POLICY "Create work orders"
ON public.work_orders FOR INSERT
TO authenticated
WITH CHECK (
  -- super_admin can create anywhere
  is_super_admin(auth.uid())
  -- admin can create in any department
  OR is_admin(auth.uid())
  -- regular user can create in any department (not department_head)
  OR (
    has_role(auth.uid(), 'user'::app_role) 
    AND NOT has_role(auth.uid(), 'department_head'::app_role)
  )
);