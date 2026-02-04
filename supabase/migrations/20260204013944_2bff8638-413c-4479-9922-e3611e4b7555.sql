-- Update work_orders SELECT policy to allow parent department users to view child department WOs
DROP POLICY IF EXISTS "View work orders" ON public.work_orders;

CREATE POLICY "View work orders"
ON public.work_orders
FOR SELECT
USING (
  is_super_admin(auth.uid())
  OR
  -- User's department is in the ancestor chain of the work order's department
  -- This means parent departments can see child department work orders
  department_id IN (SELECT get_department_descendants(get_user_department_id(auth.uid())))
);

-- Update work_orders UPDATE policy similarly
DROP POLICY IF EXISTS "Update work orders" ON public.work_orders;

CREATE POLICY "Update work orders"
ON public.work_orders
FOR UPDATE
USING (
  is_super_admin(auth.uid())
  OR is_admin(auth.uid())
  OR (created_by = auth.uid())
  OR department_id IN (SELECT get_department_descendants(get_user_department_id(auth.uid())))
)
WITH CHECK (
  is_super_admin(auth.uid())
  OR is_admin(auth.uid())
  OR (created_by = auth.uid())
  OR department_id IN (SELECT get_department_descendants(get_user_department_id(auth.uid())))
);

-- Update media SELECT policy to also use department descendants
DROP POLICY IF EXISTS "View media for accessible items" ON public.media;

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
  -- For work order media - check department hierarchy (parent can see child)
  (
    associated_type IN ('work_order', 'work_order_comment')
    AND EXISTS (
      SELECT 1 FROM work_orders wo
      WHERE wo.id = associated_id::uuid
      AND wo.department_id IN (SELECT get_department_descendants(get_user_department_id(auth.uid())))
    )
  )
  OR
  -- For inspection media - check department hierarchy
  (
    associated_type IN ('inspection', 'inspection_answer')
    AND EXISTS (
      SELECT 1 FROM inspections i
      WHERE i.id = associated_id::uuid
      AND i.department_id IN (SELECT get_department_descendants(get_user_department_id(auth.uid())))
    )
  )
);

-- Update inspections SELECT policy similarly
DROP POLICY IF EXISTS "View inspections" ON public.inspections;

CREATE POLICY "View inspections"
ON public.inspections
FOR SELECT
USING (
  is_super_admin(auth.uid())
  OR department_id IN (SELECT get_department_descendants(get_user_department_id(auth.uid())))
);

-- Update work_order_comments SELECT policy
DROP POLICY IF EXISTS "View comments via work order access" ON public.work_order_comments;

CREATE POLICY "View comments via work order access"
ON public.work_order_comments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM work_orders w
    WHERE w.id = work_order_comments.work_order_id
    AND (
      is_admin_or_super(auth.uid())
      OR w.department_id IN (SELECT get_department_descendants(get_user_department_id(auth.uid())))
    )
  )
);