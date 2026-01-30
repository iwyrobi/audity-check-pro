-- Create junction table for tracking multiple users who completed a work order
CREATE TABLE public.work_order_completers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  completed_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(work_order_id, user_id)
);

-- Enable RLS
ALTER TABLE public.work_order_completers ENABLE ROW LEVEL SECURITY;

-- Allow viewing completers for work orders you can see
CREATE POLICY "View completers for accessible work orders"
ON work_order_completers FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM work_orders wo
    WHERE wo.id = work_order_completers.work_order_id
    AND (is_super_admin(auth.uid()) OR wo.department_id = get_user_department_id(auth.uid()))
  )
);

-- Allow users to add themselves as completers
CREATE POLICY "Users can add themselves as completers"
ON work_order_completers FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM work_orders wo
    WHERE wo.id = work_order_completers.work_order_id
    AND (is_super_admin(auth.uid()) OR is_admin(auth.uid()) OR wo.department_id = get_user_department_id(auth.uid()))
  )
);

-- Allow users to remove themselves as completers
CREATE POLICY "Users can remove themselves as completers"
ON work_order_completers FOR DELETE
USING (user_id = auth.uid());

-- Allow admins to manage all completers
CREATE POLICY "Admins can manage completers"
ON work_order_completers FOR ALL
USING (is_super_admin(auth.uid()) OR is_admin(auth.uid()));