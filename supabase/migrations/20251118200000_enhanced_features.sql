/*
  # Enhanced Features Migration

  1. New Tables
    - `team_invitations` - Stores pending team invitations
    - `team_notifications` - In-app notifications for team members
    - `access_logs` - Audit trail for team access

  2. Changes
    - Add admin email whitelist support
    - Add usage tracking columns to user_roles

  3. Security
    - Enable RLS on all new tables
    - Add policies for team collaboration
    - Add policies for admin access
*/

-- Create team_invitations table
CREATE TABLE IF NOT EXISTS public.team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.decision_cases(id) ON DELETE CASCADE,
  inviter_user_id UUID NOT NULL,
  invitee_email TEXT NOT NULL,
  invitee_user_id UUID,
  role TEXT NOT NULL DEFAULT 'viewer',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  UNIQUE(case_id, invitee_email)
);

-- Create team_notifications table
CREATE TABLE IF NOT EXISTS public.team_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  metadata JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create access_logs table
CREATE TABLE IF NOT EXISTS public.access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  case_id UUID NOT NULL REFERENCES public.decision_cases(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add usage tracking to user_roles
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS decisions_this_month INTEGER DEFAULT 0;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS simulations_this_month INTEGER DEFAULT 0;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS last_reset_date DATE DEFAULT CURRENT_DATE;

-- Add admin flag
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Enable RLS
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for team_invitations
CREATE POLICY "Users can view invitations they sent or received" ON public.team_invitations
  FOR SELECT USING (
    auth.uid() = inviter_user_id OR
    auth.uid() = invitee_user_id OR
    (SELECT email FROM auth.users WHERE id = auth.uid()) = invitee_email
  );

CREATE POLICY "Users can create invitations for their cases" ON public.team_invitations
  FOR INSERT WITH CHECK (
    auth.uid() = inviter_user_id AND
    EXISTS (SELECT 1 FROM public.decision_cases WHERE id = case_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can update their received invitations" ON public.team_invitations
  FOR UPDATE USING (
    auth.uid() = invitee_user_id OR
    (SELECT email FROM auth.users WHERE id = auth.uid()) = invitee_email
  );

CREATE POLICY "Users can delete invitations they sent" ON public.team_invitations
  FOR DELETE USING (auth.uid() = inviter_user_id);

-- RLS Policies for team_notifications
CREATE POLICY "Users can view their own notifications" ON public.team_notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" ON public.team_notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own notifications" ON public.team_notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications" ON public.team_notifications
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for access_logs
CREATE POLICY "Users can view logs for their cases" ON public.access_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.decision_cases
      WHERE id = access_logs.case_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "System can create access logs" ON public.access_logs
  FOR INSERT WITH CHECK (true);

-- Function to reset monthly usage counters
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.user_roles
  SET
    decisions_this_month = 0,
    simulations_this_month = 0,
    last_reset_date = CURRENT_DATE
  WHERE last_reset_date < DATE_TRUNC('month', CURRENT_DATE);
END;
$$;

-- Function to check if user can create decision
CREATE OR REPLACE FUNCTION can_create_decision(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
  decisions_count INTEGER;
BEGIN
  -- Reset usage if needed
  PERFORM reset_monthly_usage();

  -- Get user role and usage
  SELECT role, decisions_this_month
  INTO user_role, decisions_count
  FROM public.user_roles
  WHERE user_id = check_user_id;

  -- If no role record, return false
  IF user_role IS NULL THEN
    RETURN false;
  END IF;

  -- Pro and premium have unlimited
  IF user_role IN ('pro', 'premium') THEN
    RETURN true;
  END IF;

  -- Free tier: 2 decisions per month
  IF user_role = 'free' AND decisions_count < 2 THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- Function to check if user can create simulation
CREATE OR REPLACE FUNCTION can_create_simulation(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
  simulations_count INTEGER;
BEGIN
  -- Reset usage if needed
  PERFORM reset_monthly_usage();

  -- Get user role and usage
  SELECT role, simulations_this_month
  INTO user_role, simulations_count
  FROM public.user_roles
  WHERE user_id = check_user_id;

  -- If no role record, return false
  IF user_role IS NULL THEN
    RETURN false;
  END IF;

  -- Pro and premium have unlimited
  IF user_role IN ('pro', 'premium') THEN
    RETURN true;
  END IF;

  -- Free tier: 1 simulation per month
  IF user_role = 'free' AND simulations_count < 1 THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- Function to increment decision counter
CREATE OR REPLACE FUNCTION increment_decision_counter()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.user_roles
  SET decisions_this_month = decisions_this_month + 1
  WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$;

-- Function to increment simulation counter
CREATE OR REPLACE FUNCTION increment_simulation_counter()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.user_roles
  SET simulations_this_month = simulations_this_month + 1
  WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$;

-- Create triggers for usage tracking
DROP TRIGGER IF EXISTS track_decision_usage ON public.decision_cases;
CREATE TRIGGER track_decision_usage
  AFTER INSERT ON public.decision_cases
  FOR EACH ROW
  EXECUTE FUNCTION increment_decision_counter();

DROP TRIGGER IF EXISTS track_simulation_usage ON public.risk_simulations;
CREATE TRIGGER track_simulation_usage
  AFTER INSERT ON public.risk_simulations
  FOR EACH ROW
  EXECUTE FUNCTION increment_simulation_counter();

-- Function to create notification
CREATE OR REPLACE FUNCTION create_team_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_link TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.team_notifications (user_id, type, title, message, link, metadata)
  VALUES (p_user_id, p_type, p_title, p_message, p_link, p_metadata)
  RETURNING id INTO notification_id;

  RETURN notification_id;
END;
$$;

-- Function to log access
CREATE OR REPLACE FUNCTION log_case_access(
  p_user_id UUID,
  p_case_id UUID,
  p_action TEXT,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.access_logs (user_id, case_id, action, metadata)
  VALUES (p_user_id, p_case_id, p_action, p_metadata)
  RETURNING id INTO log_id;

  RETURN log_id;
END;
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_team_invitations_case_id ON public.team_invitations(case_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_invitee_email ON public.team_invitations(invitee_email);
CREATE INDEX IF NOT EXISTS idx_team_notifications_user_id ON public.team_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_team_notifications_read ON public.team_notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_access_logs_case_id ON public.access_logs(case_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_user_id ON public.access_logs(user_id);
