-- Update the handle_new_user function to only handle email users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_provider TEXT;
  user_role public.user_role DEFAULT 'student';
  terms_accepted BOOLEAN DEFAULT FALSE;
  privacy_accepted BOOLEAN DEFAULT FALSE;
  marketing_consent BOOLEAN DEFAULT FALSE;
BEGIN
  -- Get the authentication provider
  user_provider := COALESCE(NEW.raw_app_meta_data->>'provider', 'email');

  -- Only handle email users in this function
  IF user_provider = 'email' THEN
    -- Extract role if provided
    IF NEW.raw_user_meta_data->>'role' IS NOT NULL THEN
      user_role := (NEW.raw_user_meta_data->>'role')::public.user_role;
    END IF;

    -- Extract terms acceptance for email signup
    IF NEW.raw_user_meta_data->>'terms_accepted' IS NOT NULL THEN
      terms_accepted := (NEW.raw_user_meta_data->>'terms_accepted')::BOOLEAN;
    END IF;

    IF NEW.raw_user_meta_data->>'privacy_policy_accepted' IS NOT NULL THEN
      privacy_accepted := (NEW.raw_user_meta_data->>'privacy_policy_accepted')::BOOLEAN;
    END IF;

    IF NEW.raw_user_meta_data->>'marketing_emails_consent' IS NOT NULL THEN
      marketing_consent := (NEW.raw_user_meta_data->>'marketing_emails_consent')::BOOLEAN;
    END IF;

    -- Insert user profile with explicit schema reference
    INSERT INTO public.user_profiles (
      id,
      email,
      first_name,
      last_name,
      role,
      terms_accepted,
      privacy_policy_accepted,
      marketing_emails_consent
    ) VALUES (
      NEW.id,
      NEW.email,
      NEW.raw_user_meta_data->>'first_name',
      NEW.raw_user_meta_data->>'last_name',
      user_role,
      terms_accepted,
      privacy_accepted,
      marketing_consent
    );

    -- If user is a teacher, create teacher profile
    IF user_role = 'teacher' THEN
      INSERT INTO public.teacher_profiles (id) VALUES (NEW.id);
    END IF;

    -- If user is a student, create student profile
    IF user_role = 'student' THEN
      INSERT INTO public.student_profiles (id) VALUES (NEW.id);
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Error creating user profile for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a separate function to handle OAuth users
CREATE OR REPLACE FUNCTION public.handle_new_oauth_user()
RETURNS TRIGGER AS $$
DECLARE
  user_provider TEXT;
  user_role public.user_role DEFAULT 'student';
  display_name TEXT;
  first_name TEXT;
  last_name TEXT;
BEGIN
  -- Get the authentication provider
  user_provider := COALESCE(NEW.raw_app_meta_data->>'provider', 'email');

  -- Only handle OAuth users in this function (not email users)
  IF user_provider != 'email' THEN
    -- Extract first_name and last_name from raw_user_meta_data
    first_name := NEW.raw_user_meta_data->>'first_name';
    last_name := NEW.raw_user_meta_data->>'last_name';

    -- For OAuth users, extract name from provider data if not available in meta_data
    IF first_name IS NULL AND NEW.raw_user_meta_data->>'full_name' IS NOT NULL THEN
      -- Split full_name into first and last name for OAuth users
      first_name := split_part(NEW.raw_user_meta_data->>'full_name', ' ', 1);
      last_name := CASE
        WHEN array_length(string_to_array(NEW.raw_user_meta_data->>'full_name', ' '), 1) > 1
        THEN substring(NEW.raw_user_meta_data->>'full_name' from length(first_name) + 2)
        ELSE NULL
      END;
    END IF;

    -- For Google OAuth, try alternate fields
    IF first_name IS NULL AND NEW.raw_user_meta_data->>'given_name' IS NOT NULL THEN
      first_name := NEW.raw_user_meta_data->>'given_name';
      last_name := NEW.raw_user_meta_data->>'family_name';
    END IF;

    -- Create display name
    IF first_name IS NOT NULL AND last_name IS NOT NULL THEN
      display_name := first_name || ' ' || last_name;
    ELSIF first_name IS NOT NULL THEN
      display_name := first_name;
    ELSIF NEW.raw_user_meta_data->>'name' IS NOT NULL THEN
      display_name := NEW.raw_user_meta_data->>'name';
    ELSE
      -- Fallback to email prefix
      display_name := split_part(NEW.email, '@', 1);
    END IF;

    -- Extract role if provided
    IF NEW.raw_user_meta_data->>'role' IS NOT NULL THEN
      user_role := (NEW.raw_user_meta_data->>'role')::public.user_role;
    END IF;

    -- Insert user profile with explicit schema reference
    INSERT INTO public.user_profiles (
      id,
      email,
      first_name,
      last_name,
      display_name,
      role,
      terms_accepted,
      privacy_policy_accepted,
      marketing_emails_consent,
      profile_completion
    ) VALUES (
      NEW.id,
      NEW.email,
      first_name,
      last_name,
      display_name,
      user_role,
      TRUE, -- OAuth users implicitly accept terms by completing OAuth flow
      TRUE, -- OAuth users implicitly accept privacy policy
      FALSE, -- Don't assume marketing consent for OAuth users
      CASE
        WHEN first_name IS NOT NULL AND last_name IS NOT NULL THEN 'basic'::public.profile_completion_status
        ELSE 'incomplete'::public.profile_completion_status
      END
    );

    -- If user is a teacher, create teacher profile
    IF user_role = 'teacher' THEN
      INSERT INTO public.teacher_profiles (id) VALUES (NEW.id);
    END IF;

    -- If user is a student, create student profile
    IF user_role = 'student' THEN
      INSERT INTO public.student_profiles (id) VALUES (NEW.id);
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Error creating OAuth user profile for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the old trigger and recreate both triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_oauth_user_created ON auth.users;

-- Create trigger for email users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();

-- Create trigger for OAuth users
CREATE TRIGGER on_auth_oauth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_oauth_user();

-- Grant INSERT permissions to postgres role to bypass RLS in triggers
GRANT INSERT ON public.user_profiles TO postgres;
GRANT INSERT ON public.teacher_profiles TO postgres;
GRANT INSERT ON public.student_profiles TO postgres;

-- Grant execute permissions for trigger functions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_oauth_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_oauth_user() TO service_role;