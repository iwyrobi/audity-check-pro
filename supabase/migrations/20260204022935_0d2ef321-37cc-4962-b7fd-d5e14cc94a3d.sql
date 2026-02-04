-- =============================================
-- MULTI-TENANT SAAS ARCHITECTURE
-- =============================================

-- 1. Create subscription plan enum
CREATE TYPE public.subscription_plan_tier AS ENUM ('starter', 'professional', 'enterprise');

-- 2. Create subscription_plans table
CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  tier subscription_plan_tier NOT NULL UNIQUE,
  max_users INTEGER NOT NULL,
  max_departments INTEGER, -- NULL = unlimited
  storage_limit_bytes BIGINT NOT NULL,
  can_upload_videos BOOLEAN NOT NULL DEFAULT false,
  can_use_work_orders BOOLEAN NOT NULL DEFAULT false,
  can_use_analytics BOOLEAN NOT NULL DEFAULT false,
  can_use_advanced_permissions BOOLEAN NOT NULL DEFAULT false,
  price_monthly_cents INTEGER NOT NULL DEFAULT 0,
  price_yearly_cents INTEGER NOT NULL DEFAULT 0,
  stripe_price_id_monthly TEXT,
  stripe_price_id_yearly TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default plans
INSERT INTO public.subscription_plans (name, tier, max_users, max_departments, storage_limit_bytes, can_upload_videos, can_use_work_orders, can_use_analytics, can_use_advanced_permissions, price_monthly_cents, price_yearly_cents)
VALUES 
  ('Starter', 'starter', 5, 2, 10737418240, false, false, false, false, 0, 0), -- 10 GB
  ('Professional', 'professional', 25, NULL, 107374182400, true, true, true, false, 4900, 49000), -- 100 GB, $49/mo
  ('Enterprise', 'enterprise', 2147483647, NULL, 536870912000, true, true, true, true, 19900, 199000); -- 500 GB, $199/mo

-- 3. Create organizations table
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  subscription_plan_id UUID REFERENCES public.subscription_plans(id) NOT NULL,
  storage_used_bytes BIGINT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  trial_ends_at TIMESTAMPTZ,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_subscription_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for slug lookups
CREATE UNIQUE INDEX idx_organizations_slug ON public.organizations(slug);
CREATE INDEX idx_organizations_stripe_customer ON public.organizations(stripe_customer_id);

-- 4. Create organization_members table (links users to orgs with roles)
CREATE TYPE public.org_role AS ENUM ('owner', 'admin', 'member');

CREATE TABLE public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  role org_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

CREATE INDEX idx_org_members_user ON public.organization_members(user_id);
CREATE INDEX idx_org_members_org ON public.organization_members(organization_id);

-- 5. Add organization_id to profiles
ALTER TABLE public.profiles 
ADD COLUMN organization_id UUID REFERENCES public.organizations(id);

CREATE INDEX idx_profiles_org ON public.profiles(organization_id);

-- 6. Add organization_id to departments
ALTER TABLE public.departments 
ADD COLUMN organization_id UUID REFERENCES public.organizations(id);

CREATE INDEX idx_departments_org ON public.departments(organization_id);

-- 7. Enable RLS on new tables
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- 8. RLS for subscription_plans (read-only for authenticated)
CREATE POLICY "Anyone can view active plans" 
ON public.subscription_plans FOR SELECT 
USING (is_active = true);

-- 9. Helper functions for organization access
CREATE OR REPLACE FUNCTION public.get_user_organization_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM profiles WHERE user_id = _user_id LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_org_member(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = _user_id AND organization_id = _org_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = _user_id 
    AND organization_id = _org_id 
    AND role IN ('owner', 'admin')
  )
$$;

CREATE OR REPLACE FUNCTION public.is_org_owner(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = _user_id 
    AND organization_id = _org_id 
    AND role = 'owner'
  )
$$;

-- 10. RLS for organizations
CREATE POLICY "Members can view their organization" 
ON public.organizations FOR SELECT 
USING (
  is_org_member(auth.uid(), id) OR is_super_admin(auth.uid())
);

CREATE POLICY "Org owners can update their organization" 
ON public.organizations FOR UPDATE 
USING (
  is_org_owner(auth.uid(), id) OR is_super_admin(auth.uid())
);

CREATE POLICY "Super admins can insert organizations" 
ON public.organizations FOR INSERT 
WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete organizations" 
ON public.organizations FOR DELETE 
USING (is_super_admin(auth.uid()));

-- 11. RLS for organization_members
CREATE POLICY "Members can view org members" 
ON public.organization_members FOR SELECT 
USING (
  is_org_member(auth.uid(), organization_id) OR is_super_admin(auth.uid())
);

CREATE POLICY "Org admins can manage members" 
ON public.organization_members FOR ALL 
USING (
  is_org_admin(auth.uid(), organization_id) OR is_super_admin(auth.uid())
);

-- 12. Function to get organization subscription details
CREATE OR REPLACE FUNCTION public.get_org_subscription(_org_id UUID)
RETURNS TABLE (
  plan_name TEXT,
  tier subscription_plan_tier,
  max_users INTEGER,
  max_departments INTEGER,
  storage_limit_bytes BIGINT,
  storage_used_bytes BIGINT,
  can_upload_videos BOOLEAN,
  can_use_work_orders BOOLEAN,
  can_use_analytics BOOLEAN,
  can_use_advanced_permissions BOOLEAN,
  stripe_subscription_status TEXT
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
    o.stripe_subscription_status
  FROM organizations o
  JOIN subscription_plans p ON o.subscription_plan_id = p.id
  WHERE o.id = _org_id
$$;

-- 13. Function to check if organization can add more users
CREATE OR REPLACE FUNCTION public.can_org_add_user(_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    SELECT COUNT(*) FROM organization_members WHERE organization_id = _org_id
  ) < (
    SELECT p.max_users 
    FROM organizations o 
    JOIN subscription_plans p ON o.subscription_plan_id = p.id 
    WHERE o.id = _org_id
  )
$$;

-- 14. Function to check if organization can add more departments
CREATE OR REPLACE FUNCTION public.can_org_add_department(_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    SELECT p.max_departments 
    FROM organizations o 
    JOIN subscription_plans p ON o.subscription_plan_id = p.id 
    WHERE o.id = _org_id
  ) IS NULL OR (
    SELECT COUNT(*) FROM departments WHERE organization_id = _org_id
  ) < (
    SELECT p.max_departments 
    FROM organizations o 
    JOIN subscription_plans p ON o.subscription_plan_id = p.id 
    WHERE o.id = _org_id
  )
$$;

-- 15. Function to check storage quota
CREATE OR REPLACE FUNCTION public.can_org_upload(_org_id UUID, _file_size_bytes BIGINT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    SELECT o.storage_used_bytes + _file_size_bytes <= p.storage_limit_bytes
    FROM organizations o 
    JOIN subscription_plans p ON o.subscription_plan_id = p.id 
    WHERE o.id = _org_id
  )
$$;

-- 16. Function to update storage used
CREATE OR REPLACE FUNCTION public.update_org_storage(_org_id UUID, _bytes_delta BIGINT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE organizations 
  SET storage_used_bytes = GREATEST(0, storage_used_bytes + _bytes_delta),
      updated_at = now()
  WHERE id = _org_id;
END;
$$;

-- 17. Function to check feature access
CREATE OR REPLACE FUNCTION public.org_has_feature(_org_id UUID, _feature TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE _feature
    WHEN 'work_orders' THEN (SELECT p.can_use_work_orders FROM organizations o JOIN subscription_plans p ON o.subscription_plan_id = p.id WHERE o.id = _org_id)
    WHEN 'analytics' THEN (SELECT p.can_use_analytics FROM organizations o JOIN subscription_plans p ON o.subscription_plan_id = p.id WHERE o.id = _org_id)
    WHEN 'videos' THEN (SELECT p.can_upload_videos FROM organizations o JOIN subscription_plans p ON o.subscription_plan_id = p.id WHERE o.id = _org_id)
    WHEN 'advanced_permissions' THEN (SELECT p.can_use_advanced_permissions FROM organizations o JOIN subscription_plans p ON o.subscription_plan_id = p.id WHERE o.id = _org_id)
    ELSE false
  END
$$;

-- 18. Create a demo organization for existing data
INSERT INTO public.organizations (id, name, slug, subscription_plan_id)
SELECT 
  '00000000-0000-0000-0000-000000000001'::UUID,
  'Demo Organization',
  'demo',
  (SELECT id FROM subscription_plans WHERE tier = 'starter')
WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE id = '00000000-0000-0000-0000-000000000001');

-- 19. Update existing profiles to belong to demo org
UPDATE public.profiles 
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- 20. Update existing departments to belong to demo org
UPDATE public.departments 
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- 21. Add existing users to demo org as members
INSERT INTO public.organization_members (organization_id, user_id, role)
SELECT '00000000-0000-0000-0000-000000000001', user_id, 'member'
FROM profiles
WHERE user_id IS NOT NULL
ON CONFLICT (organization_id, user_id) DO NOTHING;

-- 22. Make first super admin the org owner
UPDATE public.organization_members 
SET role = 'owner'
WHERE user_id IN (
  SELECT user_id FROM user_roles WHERE role = 'super_admin' LIMIT 1
);

-- 23. Update updated_at trigger for new tables
CREATE TRIGGER update_organizations_updated_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscription_plans_updated_at
BEFORE UPDATE ON public.subscription_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_org_members_updated_at
BEFORE UPDATE ON public.organization_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 24. Update departments RLS to include org check
DROP POLICY IF EXISTS "Authenticated users can view departments" ON public.departments;
DROP POLICY IF EXISTS "Super admins can manage departments" ON public.departments;

CREATE POLICY "View departments in own org" 
ON public.departments FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    organization_id = get_user_organization_id(auth.uid()) OR 
    is_super_admin(auth.uid())
  )
);

CREATE POLICY "Org admins can manage departments" 
ON public.departments FOR ALL 
USING (
  is_super_admin(auth.uid()) OR 
  is_org_admin(auth.uid(), organization_id)
);

-- 25. Update profiles RLS to include org check
DROP POLICY IF EXISTS "Users can view profiles" ON public.profiles;

CREATE POLICY "View profiles in own org" 
ON public.profiles FOR SELECT 
USING (
  is_super_admin(auth.uid()) OR
  (organization_id = get_user_organization_id(auth.uid())) OR
  (user_id = auth.uid())
);