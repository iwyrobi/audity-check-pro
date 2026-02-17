
-- Notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info', -- info, warning, success, error
  category TEXT NOT NULL DEFAULT 'general', -- work_order, inspection, defect, system
  reference_id UUID,
  reference_type TEXT, -- work_order, inspection
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own notifications"
ON public.notifications FOR DELETE
USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

CREATE INDEX idx_notifications_user_read ON public.notifications (user_id, is_read);
CREATE INDEX idx_notifications_created ON public.notifications (created_at DESC);

-- Push subscription table
CREATE TABLE public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own subscriptions"
ON public.push_subscriptions FOR ALL
USING (user_id = auth.uid());

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Trigger: notify on work order assignment
CREATE OR REPLACE FUNCTION public.notify_work_order_assigned()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.assigned_to IS NOT NULL AND (OLD.assigned_to IS NULL OR OLD.assigned_to != NEW.assigned_to) THEN
    INSERT INTO public.notifications (user_id, title, message, type, category, reference_id, reference_type)
    VALUES (
      NEW.assigned_to,
      'Work Order Assigned',
      'You have been assigned: ' || NEW.title,
      'info',
      'work_order',
      NEW.id,
      'work_order'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_work_order_assigned
AFTER UPDATE ON public.work_orders
FOR EACH ROW
EXECUTE FUNCTION public.notify_work_order_assigned();

-- Trigger: notify on new work order created (notify dept head/admin)
CREATE OR REPLACE FUNCTION public.notify_work_order_created()
RETURNS TRIGGER AS $$
DECLARE
  dept_user RECORD;
BEGIN
  -- Notify all users in the same department (except creator)
  FOR dept_user IN 
    SELECT p.user_id FROM profiles p 
    WHERE p.department_id = NEW.department_id 
    AND p.user_id != NEW.created_by
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type, category, reference_id, reference_type)
    VALUES (
      dept_user.user_id,
      'New Work Order',
      'New work order created: ' || NEW.title,
      'info',
      'work_order',
      NEW.id,
      'work_order'
    );
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_work_order_created
AFTER INSERT ON public.work_orders
FOR EACH ROW
EXECUTE FUNCTION public.notify_work_order_created();

-- Trigger: notify on inspection completed
CREATE OR REPLACE FUNCTION public.notify_inspection_completed()
RETURNS TRIGGER AS $$
DECLARE
  dept_user RECORD;
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    FOR dept_user IN 
      SELECT p.user_id FROM profiles p 
      WHERE p.department_id = NEW.department_id 
      AND p.user_id != NEW.created_by
    LOOP
      INSERT INTO public.notifications (user_id, title, message, type, category, reference_id, reference_type)
      VALUES (
        dept_user.user_id,
        'Inspection Completed',
        'Inspection completed: ' || NEW.title || ' (' || COALESCE(NEW.percentage::text, '0') || '%)',
        'success',
        'inspection',
        NEW.id,
        'inspection'
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_inspection_completed
AFTER UPDATE ON public.inspections
FOR EACH ROW
EXECUTE FUNCTION public.notify_inspection_completed();

-- Trigger: notify on defect found
CREATE OR REPLACE FUNCTION public.notify_defect_found()
RETURNS TRIGGER AS $$
DECLARE
  insp RECORD;
  dept_user RECORD;
BEGIN
  IF NEW.is_defect = true AND (OLD.is_defect IS NULL OR OLD.is_defect = false) THEN
    SELECT * INTO insp FROM inspections WHERE id = NEW.inspection_id;
    IF insp IS NOT NULL THEN
      FOR dept_user IN 
        SELECT p.user_id FROM profiles p 
        JOIN user_roles ur ON ur.user_id = p.user_id
        WHERE p.department_id = insp.department_id 
        AND ur.role IN ('admin', 'super_admin', 'department_head')
        AND p.user_id != insp.created_by
      LOOP
        INSERT INTO public.notifications (user_id, title, message, type, category, reference_id, reference_type)
        VALUES (
          dept_user.user_id,
          'Defect Found',
          'Defect reported: ' || NEW.question_text,
          'warning',
          'defect',
          insp.id,
          'inspection'
        );
      END LOOP;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_defect_found
AFTER INSERT OR UPDATE ON public.inspection_answers
FOR EACH ROW
EXECUTE FUNCTION public.notify_defect_found();
