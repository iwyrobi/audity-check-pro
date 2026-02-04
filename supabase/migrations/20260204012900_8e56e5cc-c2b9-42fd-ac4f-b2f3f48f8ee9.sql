-- Create company_settings table for organization-wide configuration
CREATE TABLE public.company_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL DEFAULT 'My Company',
  logo_url text,
  address text,
  phone text,
  email text,
  website text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- Only super admins can manage company settings
CREATE POLICY "Super admins can manage company settings"
ON public.company_settings
FOR ALL
USING (is_super_admin(auth.uid()));

-- All authenticated users can view company settings
CREATE POLICY "Authenticated users can view company settings"
ON public.company_settings
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_company_settings_updated_at
BEFORE UPDATE ON public.company_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default company settings row
INSERT INTO public.company_settings (name) VALUES ('My Company');