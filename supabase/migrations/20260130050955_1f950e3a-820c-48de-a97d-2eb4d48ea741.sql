-- Add work_order_comment as a valid associated_type for media
-- Create a new column to allow comments to have media attachments

-- First, let's verify RLS policies allow any authenticated user to add comments
-- Update RLS policy for work_order_comments to allow any authenticated user

DROP POLICY IF EXISTS "Users can insert comments on work orders in their department" ON public.work_order_comments;
DROP POLICY IF EXISTS "Users can view comments on work orders in their department" ON public.work_order_comments;

-- Allow any authenticated user to insert comments
CREATE POLICY "Authenticated users can insert comments"
ON public.work_order_comments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Allow any authenticated user to view comments
CREATE POLICY "Authenticated users can view comments"
ON public.work_order_comments
FOR SELECT
TO authenticated
USING (true);

-- Allow users to delete their own comments
CREATE POLICY "Users can delete their own comments"
ON public.work_order_comments
FOR DELETE
TO authenticated
USING (auth.uid() = created_by);