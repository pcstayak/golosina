-- Fix the handle_new_user function to properly handle OAuth users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role user_role DEFAULT 'student';
  display_name TEXT;
  first_name TEXT;
  last_name TEXT;
  terms_accepted BOOLEAN DEFAULT FALSE;
  privacy_accepted BOOLEAN DEFAULT FALSE;
  marketing_consent BOOLEAN DEFAULT FALSE;
BEGIN
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
    user_role := (NEW.raw_user_meta_data->>'role')::user_role;
  END IF;
  
  -- Extract terms acceptance (for email signup)
  IF NEW.raw_user_meta_data->>'terms_accepted' IS NOT NULL THEN
    terms_accepted := (NEW.raw_user_meta_data->>'terms_accepted')::BOOLEAN;
  END IF;
  
  IF NEW.raw_user_meta_data->>'privacy_policy_accepted' IS NOT NULL THEN
    privacy_accepted := (NEW.raw_user_meta_data->>'privacy_policy_accepted')::BOOLEAN;
  END IF;
  
  IF NEW.raw_user_meta_data->>'marketing_emails_consent' IS NOT NULL THEN
    marketing_consent := (NEW.raw_user_meta_data->>'marketing_emails_consent')::BOOLEAN;
  END IF;
  
  -- For OAuth users, assume terms are accepted if they complete the OAuth flow
  -- This is reasonable since they've agreed to sign up through the OAuth provider
  IF NEW.aud = 'authenticated' AND NEW.app_metadata->>'provider' != 'email' THEN
    terms_accepted := TRUE;
    privacy_accepted := TRUE;
    -- Don't assume marketing consent for OAuth users
  END IF;
  
  -- Insert user profile
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
    terms_accepted,
    privacy_accepted,
    marketing_consent,
    CASE 
      WHEN first_name IS NOT NULL AND last_name IS NOT NULL THEN 'basic'::profile_completion_status
      ELSE 'incomplete'::profile_completion_status
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
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    -- The user will still be created in auth.users and can complete profile setup later
    RAISE WARNING 'Error creating user profile for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the old trigger and recreate it
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();