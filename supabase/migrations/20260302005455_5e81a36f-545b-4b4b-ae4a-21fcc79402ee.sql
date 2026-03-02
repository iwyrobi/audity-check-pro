
-- Create a helper function to check if super_admin belongs to same org
CREATE OR REPLACE FUNCTION public.is_same_org_super_admin(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN profiles p ON p.user_id = ur.user_id
    WHERE ur.user_id = _user_id 
    AND ur.role = 'super_admin'
    AND p.organization_id = _org_id
  )
$$;

-- Fix departments: super_admin should only see/manage their own org's departments
DROP POLICY IF EXISTS "View departments in own org" ON departments;
CREATE POLICY "View departments in own org" ON departments
FOR SELECT TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND (
    organization_id = get_user_organization_id(auth.uid())
    OR is_same_org_super_admin(auth.uid(), organization_id)
  )
);

DROP POLICY IF EXISTS "Org admins can manage departments" ON departments;
CREATE POLICY "Org admins can manage departments" ON departments
FOR ALL TO authenticated
USING (
  organization_id = get_user_organization_id(auth.uid())
  AND (is_super_admin(auth.uid()) OR is_org_admin(auth.uid(), organization_id))
);

-- Fix inspections: scope super_admin to own org
DROP POLICY IF EXISTS "View inspections" ON inspections;
CREATE POLICY "View inspections" ON inspections
FOR SELECT TO authenticated
USING (
  (is_super_admin(auth.uid()) AND department_id IN (
    SELECT id FROM departments WHERE organization_id = get_user_organization_id(auth.uid())
  ))
  OR department_id IN (
    SELECT get_department_descendants(get_user_department_id(auth.uid()))
  )
);

DROP POLICY IF EXISTS "Create inspections in own department" ON inspections;
CREATE POLICY "Create inspections in own department" ON inspections
FOR INSERT TO authenticated
WITH CHECK (
  (is_super_admin(auth.uid()) AND department_id IN (
    SELECT id FROM departments WHERE organization_id = get_user_organization_id(auth.uid())
  ))
  OR (is_admin(auth.uid()) AND department_id IN (
    SELECT id FROM departments WHERE organization_id = get_user_organization_id(auth.uid())
  ))
  OR (is_department_member(auth.uid(), department_id) AND NOT has_role(auth.uid(), 'department_head'))
);

DROP POLICY IF EXISTS "Update inspections" ON inspections;
CREATE POLICY "Update inspections" ON inspections
FOR UPDATE TO authenticated
USING (
  (is_super_admin(auth.uid()) AND department_id IN (
    SELECT id FROM departments WHERE organization_id = get_user_organization_id(auth.uid())
  ))
  OR is_admin(auth.uid())
  OR created_by = auth.uid()
  OR is_department_head(auth.uid(), department_id)
);

DROP POLICY IF EXISTS "Delete inspections" ON inspections;
CREATE POLICY "Delete inspections" ON inspections
FOR DELETE TO authenticated
USING (
  (is_super_admin(auth.uid()) AND department_id IN (
    SELECT id FROM departments WHERE organization_id = get_user_organization_id(auth.uid())
  ))
  OR (is_admin(auth.uid()) AND department_id = get_user_department_id(auth.uid()))
);

-- Fix work_orders: scope super_admin to own org
DROP POLICY IF EXISTS "View work orders" ON work_orders;
CREATE POLICY "View work orders" ON work_orders
FOR SELECT TO authenticated
USING (
  (is_super_admin(auth.uid()) AND department_id IN (
    SELECT id FROM departments WHERE organization_id = get_user_organization_id(auth.uid())
  ))
  OR created_by = auth.uid()
  OR department_id IN (
    SELECT get_department_descendants(get_user_department_id(auth.uid()))
  )
);

DROP POLICY IF EXISTS "Create work orders" ON work_orders;
CREATE POLICY "Create work orders" ON work_orders
FOR INSERT TO authenticated
WITH CHECK (
  (is_super_admin(auth.uid()) AND department_id IN (
    SELECT id FROM departments WHERE organization_id = get_user_organization_id(auth.uid())
  ))
  OR (is_admin(auth.uid()) AND department_id IN (
    SELECT id FROM departments WHERE organization_id = get_user_organization_id(auth.uid())
  ))
  OR (has_role(auth.uid(), 'user') AND NOT has_role(auth.uid(), 'department_head'))
);

DROP POLICY IF EXISTS "Update work orders" ON work_orders;
CREATE POLICY "Update work orders" ON work_orders
FOR UPDATE TO authenticated
USING (
  (is_super_admin(auth.uid()) AND department_id IN (
    SELECT id FROM departments WHERE organization_id = get_user_organization_id(auth.uid())
  ))
  OR (is_admin(auth.uid()) AND department_id IN (
    SELECT get_department_descendants(get_user_department_id(auth.uid()))
  ))
  OR created_by = auth.uid()
  OR department_id IN (
    SELECT get_department_descendants(get_user_department_id(auth.uid()))
  )
)
WITH CHECK (
  (is_super_admin(auth.uid()) AND department_id IN (
    SELECT id FROM departments WHERE organization_id = get_user_organization_id(auth.uid())
  ))
  OR (is_admin(auth.uid()) AND department_id IN (
    SELECT get_department_descendants(get_user_department_id(auth.uid()))
  ))
  OR created_by = auth.uid()
  OR department_id IN (
    SELECT get_department_descendants(get_user_department_id(auth.uid()))
  )
);

DROP POLICY IF EXISTS "Delete work orders" ON work_orders;
CREATE POLICY "Delete work orders" ON work_orders
FOR DELETE TO authenticated
USING (
  (is_super_admin(auth.uid()) AND department_id IN (
    SELECT id FROM departments WHERE organization_id = get_user_organization_id(auth.uid())
  ))
  OR (is_admin(auth.uid()) AND department_id = get_user_department_id(auth.uid()))
);

-- Fix checklist_templates: scope to own org
DROP POLICY IF EXISTS "Admins and super admins can manage templates" ON checklist_templates;
CREATE POLICY "Admins and super admins can manage templates" ON checklist_templates
FOR ALL TO authenticated
USING (
  (is_super_admin(auth.uid()) AND department_id IN (
    SELECT id FROM departments WHERE organization_id = get_user_organization_id(auth.uid())
  ))
  OR (is_admin(auth.uid()) AND department_id IN (
    SELECT get_department_descendants(get_user_department_id(auth.uid()))
  ))
);

DROP POLICY IF EXISTS "View templates in own department or admin" ON checklist_templates;
CREATE POLICY "View templates in own department or admin" ON checklist_templates
FOR SELECT TO authenticated
USING (
  (is_super_admin(auth.uid()) AND department_id IN (
    SELECT id FROM departments WHERE organization_id = get_user_organization_id(auth.uid())
  ))
  OR (is_admin(auth.uid()) AND department_id IN (
    SELECT get_department_descendants(get_user_department_id(auth.uid()))
  ))
  OR department_id = get_user_department_id(auth.uid())
  OR assigned_to = auth.uid()
);

-- Fix profiles: scope super_admin to own org
DROP POLICY IF EXISTS "View profiles in own org" ON profiles;
CREATE POLICY "View profiles in own org" ON profiles
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR (is_super_admin(auth.uid()) AND organization_id = get_user_organization_id(auth.uid()))
  OR organization_id = get_user_organization_id(auth.uid())
);

-- Fix organizations: scope super_admin to own org
DROP POLICY IF EXISTS "Members can view their organization" ON organizations;
CREATE POLICY "Members can view their organization" ON organizations
FOR SELECT TO authenticated
USING (
  is_org_member(auth.uid(), id)
);

DROP POLICY IF EXISTS "Org owners can update their organization" ON organizations;
CREATE POLICY "Org owners can update their organization" ON organizations
FOR UPDATE TO authenticated
USING (
  is_org_owner(auth.uid(), id) OR is_same_org_super_admin(auth.uid(), id)
);

DROP POLICY IF EXISTS "Super admins can delete organizations" ON organizations;
CREATE POLICY "Super admins can delete organizations" ON organizations
FOR DELETE TO authenticated
USING (
  is_same_org_super_admin(auth.uid(), id)
);

DROP POLICY IF EXISTS "Super admins can insert organizations" ON organizations;
CREATE POLICY "Super admins can insert organizations" ON organizations
FOR INSERT TO authenticated
WITH CHECK (
  is_super_admin(auth.uid())
);

-- Fix organization_members: scope to own org
DROP POLICY IF EXISTS "Members can view org members" ON organization_members;
CREATE POLICY "Members can view org members" ON organization_members
FOR SELECT TO authenticated
USING (
  is_org_member(auth.uid(), organization_id)
);

DROP POLICY IF EXISTS "Org admins can manage members" ON organization_members;
CREATE POLICY "Org admins can manage members" ON organization_members
FOR ALL TO authenticated
USING (
  is_org_admin(auth.uid(), organization_id) OR is_same_org_super_admin(auth.uid(), organization_id)
);

-- Fix user_roles: scope super_admin to own org's users
DROP POLICY IF EXISTS "Super admins can manage roles" ON user_roles;
CREATE POLICY "Super admins can manage roles" ON user_roles
FOR ALL TO authenticated
USING (
  is_super_admin(auth.uid()) 
  AND EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = user_roles.user_id 
    AND p.organization_id = get_user_organization_id(auth.uid())
  )
);

DROP POLICY IF EXISTS "Super admins can view all roles" ON user_roles;
CREATE POLICY "Super admins can view all roles" ON user_roles
FOR SELECT TO authenticated
USING (
  is_super_admin(auth.uid()) 
  AND EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = user_roles.user_id 
    AND p.organization_id = get_user_organization_id(auth.uid())
  )
);
