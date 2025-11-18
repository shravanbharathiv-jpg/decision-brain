/*
  # Admin Setup Migration

  1. Functions
    - Auto-assign admin role to specific email
    - Handle user role creation on signup

  2. Changes
    - Add trigger for automatic admin assignment
*/

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- Get user email
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = NEW.id;

  -- Insert user role with admin check
  INSERT INTO public.user_roles (user_id, role, is_admin)
  VALUES (
    NEW.id,
    'free',
    user_email = 'shravanbvidhya@gmail.com'
  );

  -- Create profile
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, user_email)
  ON CONFLICT (user_id) DO NOTHING;

  -- Create subscription record
  INSERT INTO public.subscriptions (user_id, status)
  VALUES (NEW.id, 'free')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Update existing admin user if exists
DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'shravanbvidhya@gmail.com';

  IF admin_user_id IS NOT NULL THEN
    UPDATE public.user_roles
    SET is_admin = true
    WHERE user_id = admin_user_id;
  END IF;
END $$;
