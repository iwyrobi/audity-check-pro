-- Fix work order SELECT policy to include creators (so WO owners can always see their WOs regardless of status)
DROP POLICY IF EXISTS "View work orders" ON public.work_orders;

CREATE POLICY "View work orders" 
ON public.work_orders 
FOR SELECT
USING (
  is_super_admin(auth.uid()) 
  OR (created_by = auth.uid())
  OR (department_id IN ( SELECT get_department_descendants(get_user_department_id(auth.uid())) AS get_department_descendants))
);