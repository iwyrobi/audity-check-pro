
-- ============================================================
-- 1. Fix template_sections RLS: org-scope admin checks
-- ============================================================
DROP POLICY IF EXISTS "Manage sections via template access" ON template_sections;
DROP POLICY IF EXISTS "View sections via template access" ON template_sections;

CREATE POLICY "Manage sections via template access" ON template_sections
FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM checklist_templates t
  JOIN departments d ON d.id = t.department_id
  WHERE t.id = template_sections.template_id
  AND d.organization_id = get_user_organization_id(auth.uid())
  AND (is_super_admin(auth.uid()) OR is_admin(auth.uid()) OR is_department_head(auth.uid(), t.department_id))
));

CREATE POLICY "View sections via template access" ON template_sections
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM checklist_templates t
  JOIN departments d ON d.id = t.department_id
  WHERE t.id = template_sections.template_id
  AND d.organization_id = get_user_organization_id(auth.uid())
  AND (is_super_admin(auth.uid()) OR is_admin(auth.uid()) OR t.department_id = get_user_department_id(auth.uid()))
));

-- ============================================================
-- 2. Fix template_questions RLS: org-scope admin checks
-- ============================================================
DROP POLICY IF EXISTS "Manage questions via section access" ON template_questions;
DROP POLICY IF EXISTS "View questions via section access" ON template_questions;

CREATE POLICY "Manage questions via section access" ON template_questions
FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM template_sections s
  JOIN checklist_templates t ON s.template_id = t.id
  JOIN departments d ON d.id = t.department_id
  WHERE s.id = template_questions.section_id
  AND d.organization_id = get_user_organization_id(auth.uid())
  AND (is_super_admin(auth.uid()) OR is_admin(auth.uid()) OR is_department_head(auth.uid(), t.department_id))
));

CREATE POLICY "View questions via section access" ON template_questions
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM template_sections s
  JOIN checklist_templates t ON s.template_id = t.id
  JOIN departments d ON d.id = t.department_id
  WHERE s.id = template_questions.section_id
  AND d.organization_id = get_user_organization_id(auth.uid())
  AND (is_super_admin(auth.uid()) OR is_admin(auth.uid()) OR t.department_id = get_user_department_id(auth.uid()))
));

-- ============================================================
-- 3. Fix inspection_answers RLS: org-scope admin checks
-- ============================================================
DROP POLICY IF EXISTS "Manage answers via inspection access" ON inspection_answers;
DROP POLICY IF EXISTS "View answers via inspection access" ON inspection_answers;

CREATE POLICY "Manage answers via inspection access" ON inspection_answers
FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM inspections i
  JOIN departments d ON d.id = i.department_id
  WHERE i.id = inspection_answers.inspection_id
  AND d.organization_id = get_user_organization_id(auth.uid())
  AND (is_super_admin(auth.uid()) OR is_admin(auth.uid()) OR i.created_by = auth.uid() OR is_department_head(auth.uid(), i.department_id))
));

CREATE POLICY "View answers via inspection access" ON inspection_answers
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM inspections i
  JOIN departments d ON d.id = i.department_id
  WHERE i.id = inspection_answers.inspection_id
  AND d.organization_id = get_user_organization_id(auth.uid())
  AND (is_super_admin(auth.uid()) OR is_admin(auth.uid()) OR i.department_id = get_user_department_id(auth.uid()))
));

-- ============================================================
-- 4. Fix work_order_comments RLS: org-scope checks
-- ============================================================
DROP POLICY IF EXISTS "View comments via work order access" ON work_order_comments;
DROP POLICY IF EXISTS "Create comments in accessible work orders" ON work_order_comments;
DROP POLICY IF EXISTS "Authenticated users can insert comments" ON work_order_comments;

CREATE POLICY "View comments via work order access" ON work_order_comments
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM work_orders wo
  JOIN departments d ON d.id = wo.department_id
  WHERE wo.id = work_order_comments.work_order_id
  AND d.organization_id = get_user_organization_id(auth.uid())
  AND (is_super_admin(auth.uid()) OR is_admin(auth.uid()) OR wo.department_id IN (SELECT get_department_descendants(get_user_department_id(auth.uid()))))
));

CREATE POLICY "Create comments in accessible work orders" ON work_order_comments
FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM work_orders wo
    JOIN departments d ON d.id = wo.department_id
    WHERE wo.id = work_order_comments.work_order_id
    AND d.organization_id = get_user_organization_id(auth.uid())
  )
);

-- ============================================================
-- 5. Fix work_order_completers RLS: org-scope checks
-- ============================================================
DROP POLICY IF EXISTS "Admins can manage completers" ON work_order_completers;
DROP POLICY IF EXISTS "Users can add themselves as completers" ON work_order_completers;
DROP POLICY IF EXISTS "Users can remove themselves as completers" ON work_order_completers;
DROP POLICY IF EXISTS "View completers for accessible work orders" ON work_order_completers;

CREATE POLICY "Admins can manage completers" ON work_order_completers
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM work_orders wo
    JOIN departments d ON d.id = wo.department_id
    WHERE wo.id = work_order_completers.work_order_id
    AND d.organization_id = get_user_organization_id(auth.uid())
    AND (is_super_admin(auth.uid()) OR is_admin(auth.uid()))
  )
);

CREATE POLICY "Users can add themselves as completers" ON work_order_completers
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM work_orders wo
    JOIN departments d ON d.id = wo.department_id
    WHERE wo.id = work_order_completers.work_order_id
    AND d.organization_id = get_user_organization_id(auth.uid())
  )
);

CREATE POLICY "Users can remove themselves as completers" ON work_order_completers
FOR DELETE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "View completers for accessible work orders" ON work_order_completers
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM work_orders wo
  JOIN departments d ON d.id = wo.department_id
  WHERE wo.id = work_order_completers.work_order_id
  AND d.organization_id = get_user_organization_id(auth.uid())
));

-- ============================================================
-- 6. Fix media RLS: org-scope the admin SELECT
-- ============================================================
DROP POLICY IF EXISTS "View media for accessible items" ON media;

CREATE POLICY "View media for accessible items" ON media
FOR SELECT TO authenticated
USING (
  uploaded_by = auth.uid()
  OR (
    (is_super_admin(auth.uid()) OR is_admin(auth.uid()))
    AND (
      (associated_type IN ('work_order', 'work_order_comment') AND EXISTS (
        SELECT 1 FROM work_orders wo
        JOIN departments d ON d.id = wo.department_id
        WHERE wo.id = media.associated_id
        AND d.organization_id = get_user_organization_id(auth.uid())
      ))
      OR (associated_type IN ('inspection', 'inspection_answer') AND EXISTS (
        SELECT 1 FROM inspections i
        JOIN departments d ON d.id = i.department_id
        WHERE i.id = media.associated_id
        AND d.organization_id = get_user_organization_id(auth.uid())
      ))
    )
  )
  OR (associated_type IN ('work_order', 'work_order_comment') AND EXISTS (
    SELECT 1 FROM work_orders wo
    WHERE wo.id = media.associated_id
    AND wo.department_id IN (SELECT get_department_descendants(get_user_department_id(auth.uid())))
  ))
  OR (associated_type IN ('inspection', 'inspection_answer') AND EXISTS (
    SELECT 1 FROM inspections i
    WHERE i.id = media.associated_id
    AND i.department_id IN (SELECT get_department_descendants(get_user_department_id(auth.uid())))
  ))
);

-- ============================================================
-- 7. Fix notifications INSERT: only allow inserting for self
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can insert notifications" ON notifications;

CREATE POLICY "System and self can insert notifications" ON notifications
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 8. Drop legacy company_settings table
-- ============================================================
DROP TABLE IF EXISTS company_settings;
