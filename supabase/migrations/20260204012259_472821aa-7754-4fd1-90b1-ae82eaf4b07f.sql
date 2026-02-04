-- Drop existing SELECT policy for media
DROP POLICY IF EXISTS "View media for accessible items" ON public.media;

-- Create SELECT policy that allows viewing media based on access to the associated entity
-- Users can view media if:
-- 1. They uploaded it themselves
-- 2. They are admin or super_admin
-- 3. They belong to the same department as the associated work order
-- 4. They belong to the same department as the associated inspection
CREATE POLICY "View media for accessible items"
ON public.media
FOR SELECT
USING (
  -- User uploaded it themselves
  uploaded_by = auth.uid()
  OR
  -- User is admin or super_admin
  is_admin_or_super(auth.uid())
  OR
  -- For work order media - check department membership
  (
    associated_type IN ('work_order', 'work_order_comment')
    AND EXISTS (
      SELECT 1 FROM work_orders wo
      WHERE wo.id = associated_id::uuid
      AND wo.department_id IN (SELECT get_department_descendants(get_user_department_id(auth.uid())))
    )
  )
  OR
  -- For inspection media - check department membership  
  (
    associated_type IN ('inspection', 'inspection_answer')
    AND EXISTS (
      SELECT 1 FROM inspections i
      WHERE i.id = associated_id::uuid
      AND i.department_id IN (SELECT get_department_descendants(get_user_department_id(auth.uid())))
    )
  )
);