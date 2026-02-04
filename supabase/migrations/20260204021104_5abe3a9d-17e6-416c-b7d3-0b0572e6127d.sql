-- Add once_daily column to checklist_templates
ALTER TABLE public.checklist_templates
ADD COLUMN once_daily boolean NOT NULL DEFAULT false;