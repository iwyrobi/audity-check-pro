-- Fix 1: Replace public departments policy with authenticated-only access
DROP POLICY IF EXISTS "Anyone can view departments" ON public.departments;

CREATE POLICY "Authenticated users can view departments" 
ON public.departments 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Fix 2: Make the uploads bucket private
UPDATE storage.buckets SET public = false WHERE id = 'uploads';

-- Fix 3: Replace public storage view policy with authenticated access
DROP POLICY IF EXISTS "Anyone can view uploads" ON storage.objects;

CREATE POLICY "Authenticated users can view uploads" ON storage.objects
FOR SELECT USING (
  bucket_id = 'uploads' 
  AND auth.role() = 'authenticated'
);

-- Fix 4: Replace overly permissive work_order_comments SELECT policy
-- Remove the policy that allows all authenticated users to view all comments
DROP POLICY IF EXISTS "Authenticated users can view comments" ON public.work_order_comments;