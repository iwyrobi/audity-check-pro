-- Add parent_id column to departments for hierarchy
ALTER TABLE public.departments
ADD COLUMN parent_id uuid REFERENCES public.departments(id) ON DELETE SET NULL;

-- Add index for faster parent lookups
CREATE INDEX idx_departments_parent_id ON public.departments(parent_id);

-- Create a function to get all ancestor department ids
CREATE OR REPLACE FUNCTION public.get_department_ancestors(_department_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE ancestors AS (
    SELECT id, parent_id FROM departments WHERE id = _department_id
    UNION ALL
    SELECT d.id, d.parent_id FROM departments d
    INNER JOIN ancestors a ON d.id = a.parent_id
  )
  SELECT id FROM ancestors;
$$;

-- Create a function to get all descendant department ids
CREATE OR REPLACE FUNCTION public.get_department_descendants(_department_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE descendants AS (
    SELECT id, parent_id FROM departments WHERE id = _department_id
    UNION ALL
    SELECT d.id, d.parent_id FROM departments d
    INNER JOIN descendants ds ON d.parent_id = ds.id
  )
  SELECT id FROM descendants;
$$;