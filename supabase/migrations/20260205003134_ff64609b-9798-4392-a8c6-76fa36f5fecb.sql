-- Add company-related fields to organizations table
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS logo_url text,
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS website text;