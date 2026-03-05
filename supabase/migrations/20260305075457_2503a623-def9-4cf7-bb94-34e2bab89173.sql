
-- Add subscription_expires_at to organizations
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS subscription_expires_at timestamp with time zone;

-- Create payments table for payment history and invoices
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  order_id text NOT NULL UNIQUE,
  plan_tier text NOT NULL,
  billing_cycle text NOT NULL,
  amount integer NOT NULL,
  currency text NOT NULL DEFAULT 'IDR',
  status text NOT NULL DEFAULT 'pending',
  payment_method text,
  transaction_id text,
  paid_at timestamp with time zone,
  subscription_start timestamp with time zone,
  subscription_end timestamp with time zone,
  invoice_number text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- RLS: Org members can view their own org's payments
CREATE POLICY "View own org payments"
  ON public.payments
  FOR SELECT
  TO authenticated
  USING (is_org_member(auth.uid(), organization_id));

-- RLS: Only service role can insert/update (via webhook)
-- No INSERT/UPDATE/DELETE policies for authenticated users

-- Create index for faster lookups
CREATE INDEX idx_payments_organization_id ON public.payments(organization_id);
CREATE INDEX idx_payments_order_id ON public.payments(order_id);

-- Generate invoice numbers using a sequence
CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq START WITH 1001;
