
-- Fix the overly permissive INSERT policy - notifications are inserted by SECURITY DEFINER triggers
-- but we still want basic auth check
DROP POLICY "System can insert notifications" ON public.notifications;
CREATE POLICY "Authenticated can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);
