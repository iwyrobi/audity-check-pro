
DROP FUNCTION IF EXISTS public.get_org_subscription(uuid);

CREATE FUNCTION public.get_org_subscription(_org_id uuid)
RETURNS TABLE(
  plan_name text, 
  tier subscription_plan_tier, 
  max_users integer, 
  max_departments integer, 
  storage_limit_bytes bigint, 
  storage_used_bytes bigint, 
  can_upload_videos boolean, 
  can_use_work_orders boolean, 
  can_use_analytics boolean, 
  can_use_advanced_permissions boolean, 
  stripe_subscription_status text,
  subscription_expires_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.name,
    p.tier,
    p.max_users,
    p.max_departments,
    p.storage_limit_bytes,
    o.storage_used_bytes,
    p.can_upload_videos,
    p.can_use_work_orders,
    p.can_use_analytics,
    p.can_use_advanced_permissions,
    o.stripe_subscription_status,
    o.subscription_expires_at
  FROM organizations o
  JOIN subscription_plans p ON o.subscription_plan_id = p.id
  WHERE o.id = _org_id
$$;
