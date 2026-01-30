-- Update profiles SELECT policy to also allow viewing profiles of work order creators
-- that the current user can see

DROP POLICY IF EXISTS "Users can view profiles" ON profiles;

CREATE POLICY "Users can view profiles" ON profiles
FOR SELECT
USING (
  is_super_admin(auth.uid())
  OR (department_id = get_user_department_id(auth.uid()))
  OR (user_id = auth.uid())
  -- Allow viewing profiles of users who created work orders visible to current user
  OR EXISTS (
    SELECT 1 FROM work_orders wo
    WHERE wo.created_by = profiles.user_id
    AND (
      is_super_admin(auth.uid())
      OR wo.department_id = get_user_department_id(auth.uid())
    )
  )
);