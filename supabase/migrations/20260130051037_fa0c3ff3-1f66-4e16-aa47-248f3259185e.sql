-- Update media RLS policies to support work_order_comment as associated_type

DROP POLICY IF EXISTS "Upload media to accessible items" ON public.media;
DROP POLICY IF EXISTS "View media for accessible items" ON public.media;

-- Allow authenticated users to upload media for comments
CREATE POLICY "Upload media to accessible items"
ON public.media
FOR INSERT
TO authenticated
WITH CHECK (
  uploaded_by = auth.uid() AND (
    is_admin(auth.uid()) OR
    (associated_type = 'inspection' AND EXISTS (
      SELECT 1 FROM inspections i 
      WHERE i.id = media.associated_id 
      AND i.department_id = get_user_department_id(auth.uid())
    )) OR
    (associated_type = 'inspection_answer' AND EXISTS (
      SELECT 1 FROM inspection_answers ia
      JOIN inspections i ON i.id = ia.inspection_id
      WHERE ia.id = media.associated_id 
      AND i.department_id = get_user_department_id(auth.uid())
    )) OR
    (associated_type = 'work_order' AND EXISTS (
      SELECT 1 FROM work_orders w 
      WHERE w.id = media.associated_id 
      AND w.department_id = get_user_department_id(auth.uid())
    )) OR
    (associated_type = 'work_order_comment' AND EXISTS (
      SELECT 1 FROM work_order_comments c 
      WHERE c.id = media.associated_id 
      AND c.created_by = auth.uid()
    ))
  )
);

-- Allow viewing media for accessible items
CREATE POLICY "View media for accessible items"
ON public.media
FOR SELECT
TO authenticated
USING (
  is_admin(auth.uid()) OR
  uploaded_by = auth.uid() OR
  (associated_type = 'inspection' AND EXISTS (
    SELECT 1 FROM inspections i 
    WHERE i.id = media.associated_id 
    AND i.department_id = get_user_department_id(auth.uid())
  )) OR
  (associated_type = 'inspection_answer' AND EXISTS (
    SELECT 1 FROM inspection_answers ia
    JOIN inspections i ON i.id = ia.inspection_id
    WHERE ia.id = media.associated_id 
    AND i.department_id = get_user_department_id(auth.uid())
  )) OR
  (associated_type = 'work_order' AND EXISTS (
    SELECT 1 FROM work_orders w 
    WHERE w.id = media.associated_id 
    AND w.department_id = get_user_department_id(auth.uid())
  )) OR
  (associated_type = 'work_order_comment' AND EXISTS (
    SELECT 1 FROM work_order_comments c
    JOIN work_orders w ON w.id = c.work_order_id
    WHERE c.id = media.associated_id 
    AND w.department_id = get_user_department_id(auth.uid())
  ))
);