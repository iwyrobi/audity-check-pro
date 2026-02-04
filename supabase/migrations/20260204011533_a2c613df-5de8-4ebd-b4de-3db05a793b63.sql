-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Upload media to accessible items" ON public.media;

-- Create more permissive INSERT policy that allows uploads by authenticated users
-- The policy allows any authenticated user to upload if they set uploaded_by to their own ID
-- This supports temporary IDs during work order creation
CREATE POLICY "Upload media to accessible items"
ON public.media
FOR INSERT
WITH CHECK (
  uploaded_by = auth.uid()
);