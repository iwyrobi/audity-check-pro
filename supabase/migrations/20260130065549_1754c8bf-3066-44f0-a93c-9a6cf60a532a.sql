-- Create a security definer function to get profile name without RLS restrictions
-- This allows fetching creator names for work orders regardless of department

CREATE OR REPLACE FUNCTION public.get_profile_name(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(full_name, 'Unknown') FROM profiles WHERE user_id = _user_id LIMIT 1
$$;

-- Grant execute to authenticated users
REVOKE ALL ON FUNCTION public.get_profile_name(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_profile_name(uuid) TO authenticated;