
-- =============================================
-- 1. FIX: work_orders INSERT — add org check for regular users
-- =============================================
DROP POLICY IF EXISTS "Create work orders" ON public.work_orders;
CREATE POLICY "Create work orders" ON public.work_orders
FOR INSERT TO authenticated
WITH CHECK (
  (
    -- Super admin: any dept in own org
    is_super_admin(auth.uid()) AND department_id IN (
      SELECT id FROM departments WHERE organization_id = get_user_organization_id(auth.uid())
    )
  ) OR (
    -- Admin: any dept in own org
    is_admin(auth.uid()) AND department_id IN (
      SELECT id FROM departments WHERE organization_id = get_user_organization_id(auth.uid())
    )
  ) OR (
    -- Regular user (not dept head): must be in own org department
    has_role(auth.uid(), 'user'::app_role)
    AND NOT has_role(auth.uid(), 'department_head'::app_role)
    AND department_id IN (
      SELECT id FROM departments WHERE organization_id = get_user_organization_id(auth.uid())
    )
  )
);

-- =============================================
-- 2. FIX: inspections UPDATE — scope admin to own org
-- =============================================
DROP POLICY IF EXISTS "Update inspections" ON public.inspections;
CREATE POLICY "Update inspections" ON public.inspections
FOR UPDATE TO authenticated
USING (
  (
    is_super_admin(auth.uid()) AND department_id IN (
      SELECT id FROM departments WHERE organization_id = get_user_organization_id(auth.uid())
    )
  ) OR (
    is_admin(auth.uid()) AND department_id IN (
      SELECT id FROM departments WHERE organization_id = get_user_organization_id(auth.uid())
    )
  ) OR (
    created_by = auth.uid()
  ) OR (
    is_department_head(auth.uid(), department_id)
  )
);

-- =============================================
-- 3. FIX: profiles UPDATE — scope admin to own org
-- =============================================
DROP POLICY IF EXISTS "Users can update profiles" ON public.profiles;
CREATE POLICY "Users can update profiles" ON public.profiles
FOR UPDATE TO authenticated
USING (
  (user_id = auth.uid())
  OR (
    is_super_admin(auth.uid())
    AND organization_id = get_user_organization_id(auth.uid())
  )
  OR (
    is_admin(auth.uid())
    AND organization_id = get_user_organization_id(auth.uid())
    AND department_id = get_user_department_id(auth.uid())
  )
);

-- =============================================
-- 4. FIX: media INSERT — validate associated item belongs to user's org
-- =============================================
DROP POLICY IF EXISTS "Upload media to accessible items" ON public.media;
CREATE POLICY "Upload media to accessible items" ON public.media
FOR INSERT TO authenticated
WITH CHECK (
  uploaded_by = auth.uid()
  AND (
    -- Work order media: verify org ownership
    (
      associated_type IN ('work_order', 'work_order_comment')
      AND EXISTS (
        SELECT 1 FROM work_orders wo
        JOIN departments d ON d.id = wo.department_id
        WHERE wo.id = media.associated_id
        AND d.organization_id = get_user_organization_id(auth.uid())
      )
    )
    OR
    -- Inspection media: verify org ownership
    (
      associated_type IN ('inspection', 'inspection_answer')
      AND EXISTS (
        SELECT 1 FROM inspections i
        JOIN departments d ON d.id = i.department_id
        WHERE i.id = media.associated_id
        AND d.organization_id = get_user_organization_id(auth.uid())
      )
    )
  )
);

-- =============================================
-- 5. FIX: media DELETE — allow uploader and org admins
-- =============================================
CREATE POLICY "Delete own or admin media" ON public.media
FOR DELETE TO authenticated
USING (
  (uploaded_by = auth.uid())
  OR (
    (is_super_admin(auth.uid()) OR is_admin(auth.uid()))
    AND (
      (
        associated_type IN ('work_order', 'work_order_comment')
        AND EXISTS (
          SELECT 1 FROM work_orders wo
          JOIN departments d ON d.id = wo.department_id
          WHERE wo.id = media.associated_id
          AND d.organization_id = get_user_organization_id(auth.uid())
        )
      )
      OR (
        associated_type IN ('inspection', 'inspection_answer')
        AND EXISTS (
          SELECT 1 FROM inspections i
          JOIN departments d ON d.id = i.department_id
          WHERE i.id = media.associated_id
          AND d.organization_id = get_user_organization_id(auth.uid())
        )
      )
    )
  )
);

-- =============================================
-- 6. FIX: storage.objects — scope to user folders for cross-org isolation
-- =============================================
DROP POLICY IF EXISTS "Authenticated users can view uploads" ON storage.objects;
CREATE POLICY "View uploads in own org folder" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'uploads'
  AND (
    -- Users can always view their own uploads
    (auth.uid())::text = (storage.foldername(name))[1]
    -- Admins can view all uploads (org check happens at media table level)
    OR is_admin_or_super(auth.uid())
  )
);

DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
CREATE POLICY "Authenticated users can upload to own folder" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'uploads'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);
