-- Add UPDATE policy for media to allow reassociating temp uploads with real work orders
CREATE POLICY "Update own media associations"
ON public.media
FOR UPDATE
USING (uploaded_by = auth.uid())
WITH CHECK (uploaded_by = auth.uid());