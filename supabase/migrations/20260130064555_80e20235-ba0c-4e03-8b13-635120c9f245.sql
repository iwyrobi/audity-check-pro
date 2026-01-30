-- Create a SECURITY DEFINER function to reassign work order department
-- This bypasses RLS and enforces its own permission checks

CREATE OR REPLACE FUNCTION public.reassign_work_order_department(
  _work_order_id uuid,
  _new_department_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _created_by uuid;
  _caller_id uuid := auth.uid();
BEGIN
  -- Check caller is authenticated
  IF _caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get the work order creator
  SELECT created_by INTO _created_by
  FROM work_orders
  WHERE id = _work_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Work order not found';
  END IF;

  -- Check caller is creator, admin, or super_admin
  IF _created_by != _caller_id 
     AND NOT is_admin(_caller_id) 
     AND NOT is_super_admin(_caller_id) THEN
    RAISE EXCEPTION 'Permission denied: only creator or admin can reassign department';
  END IF;

  -- Verify new department exists
  IF NOT EXISTS (SELECT 1 FROM departments WHERE id = _new_department_id) THEN
    RAISE EXCEPTION 'Department not found';
  END IF;

  -- Perform the update
  UPDATE work_orders
  SET department_id = _new_department_id,
      updated_at = now()
  WHERE id = _work_order_id;
END;
$$;

-- Grant execute to authenticated users only
REVOKE ALL ON FUNCTION public.reassign_work_order_department(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reassign_work_order_department(uuid, uuid) TO authenticated;