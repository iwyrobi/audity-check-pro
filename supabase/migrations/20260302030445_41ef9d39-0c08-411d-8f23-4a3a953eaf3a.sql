
-- Drop the global unique constraint on department name
ALTER TABLE public.departments DROP CONSTRAINT IF EXISTS departments_name_key;

-- Add a unique constraint scoped to organization
ALTER TABLE public.departments ADD CONSTRAINT departments_name_org_unique UNIQUE (name, organization_id);
