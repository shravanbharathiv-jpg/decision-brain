/*
  # Stripe Products and Enhanced User System

  1. New Tables
    - `stripe_products` - Store Stripe product IDs
      - `id` (uuid, primary key)
      - `plan_name` (text) - free, pro, premium
      - `stripe_product_id` (text)
      - `stripe_price_id` (text)
      - `amount` (integer) - price in cents
      - `currency` (text) - default GBP
      - `interval` (text) - month, one-time
      - `created_at` (timestamptz)

  2. Changes
    - Add `is_admin` column to user_roles if not exists
    - Add functions for checking user permissions
    - Add RLS policies

  3. Security
    - Enable RLS on stripe_products table
    - Add policies for reading product information
*/

-- Create stripe_products table if not exists
CREATE TABLE IF NOT EXISTS stripe_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_name TEXT NOT NULL UNIQUE,
  stripe_product_id TEXT,
  stripe_price_id TEXT,
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'gbp',
  interval TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE stripe_products ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read product information
CREATE POLICY "Anyone can view stripe products"
  ON stripe_products
  FOR SELECT
  TO authenticated
  USING (true);

-- Add is_admin column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_roles' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE user_roles ADD COLUMN is_admin BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Add decisions_this_month and simulations_this_month if not exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_roles' AND column_name = 'decisions_this_month'
  ) THEN
    ALTER TABLE user_roles ADD COLUMN decisions_this_month INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_roles' AND column_name = 'simulations_this_month'
  ) THEN
    ALTER TABLE user_roles ADD COLUMN simulations_this_month INTEGER DEFAULT 0;
  END IF;
END $$;

-- Function to check if user can create decision
CREATE OR REPLACE FUNCTION can_create_decision(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role_record RECORD;
BEGIN
  SELECT role, decisions_this_month, is_admin
  INTO user_role_record
  FROM user_roles
  WHERE user_id = check_user_id;

  -- Admin can always create
  IF user_role_record.is_admin THEN
    RETURN true;
  END IF;

  -- Free tier: max 2 per month
  IF user_role_record.role = 'free' AND user_role_record.decisions_this_month >= 2 THEN
    RETURN false;
  END IF;

  -- Pro and premium: unlimited
  RETURN true;
END;
$$;

-- Function to check if user can create simulation
CREATE OR REPLACE FUNCTION can_create_simulation(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role_record RECORD;
BEGIN
  SELECT role, simulations_this_month, is_admin
  INTO user_role_record
  FROM user_roles
  WHERE user_id = check_user_id;

  -- Admin can always create
  IF user_role_record.is_admin THEN
    RETURN true;
  END IF;

  -- Free tier: max 1 per month
  IF user_role_record.role = 'free' AND user_role_record.simulations_this_month >= 1 THEN
    RETURN false;
  END IF;

  -- Pro and premium: unlimited
  RETURN true;
END;
$$;

-- Function to increment decision count
CREATE OR REPLACE FUNCTION increment_decision_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE user_roles
  SET decisions_this_month = decisions_this_month + 1
  WHERE user_id = NEW.user_id;

  RETURN NEW;
END;
$$;

-- Function to increment simulation count
CREATE OR REPLACE FUNCTION increment_simulation_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE user_roles
  SET simulations_this_month = simulations_this_month + 1
  WHERE user_id = NEW.user_id;

  RETURN NEW;
END;
$$;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS increment_decision_count_trigger ON decision_cases;
DROP TRIGGER IF EXISTS increment_simulation_count_trigger ON risk_simulations;

-- Create triggers
CREATE TRIGGER increment_decision_count_trigger
  AFTER INSERT ON decision_cases
  FOR EACH ROW
  EXECUTE FUNCTION increment_decision_count();

CREATE TRIGGER increment_simulation_count_trigger
  AFTER INSERT ON risk_simulations
  FOR EACH ROW
  EXECUTE FUNCTION increment_simulation_count();

-- Function to reset monthly counters (should be run via cron)
CREATE OR REPLACE FUNCTION reset_monthly_counters()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE user_roles
  SET decisions_this_month = 0,
      simulations_this_month = 0;
END;
$$;

-- Insert default product configurations (will be updated by Edge Function with real Stripe IDs)
INSERT INTO stripe_products (plan_name, amount, currency, interval, description)
VALUES
  ('free', 0, 'gbp', 'forever', '2 decisions per month, 1 simulation'),
  ('pro', 1000, 'gbp', 'month', 'Unlimited decisions and simulations, 3x better AI analysis'),
  ('premium', 5000, 'gbp', 'one-time', 'Lifetime access with premium AI and support')
ON CONFLICT (plan_name) DO NOTHING;
