
-- Create a security definer function to atomically update a user's role
-- This avoids the delete-then-insert race condition with RLS
CREATE OR REPLACE FUNCTION public.set_user_role(_target_user_id uuid, _new_role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller_id uuid := auth.uid();
  _caller_org_id uuid;
  _target_org_id uuid;
BEGIN
  IF _caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify caller is super_admin
  IF NOT is_super_admin(_caller_id) THEN
    RAISE EXCEPTION 'Permission denied: only super admins can change roles';
  END IF;

  -- Verify same organization
  _caller_org_id := get_user_organization_id(_caller_id);
  _target_org_id := get_user_organization_id(_target_user_id);

  IF _caller_org_id IS NULL OR _target_org_id IS NULL OR _caller_org_id != _target_org_id THEN
    RAISE EXCEPTION 'Permission denied: users must be in the same organization';
  END IF;

  -- Atomically delete old roles and insert new one
  DELETE FROM user_roles WHERE user_id = _target_user_id;
  INSERT INTO user_roles (user_id, role) VALUES (_target_user_id, _new_role);
END;
$$;
