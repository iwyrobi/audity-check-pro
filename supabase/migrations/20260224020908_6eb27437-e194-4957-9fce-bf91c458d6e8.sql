
-- Add foreign key for assigned_to -> profiles.user_id
ALTER TABLE public.checklist_templates 
ADD CONSTRAINT checklist_templates_assigned_to_fkey 
FOREIGN KEY (assigned_to) REFERENCES auth.users(id);
