-- Enable necessary extensions
-- Note: We use gen_random_uuid() which is built-in in Postgres 13+
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types for user roles and specializations
CREATE TYPE user_role AS ENUM ('student', 'teacher', 'admin');
CREATE TYPE teacher_specialization AS ENUM (
  'classical',
  'opera', 
  'pop_rock',
  'musical_theatre',
  'jazz',
  'country',
  'r_and_b',
  'gospel',
  'folk',
  'speech_therapy',
  'accent_reduction',
  'voice_over',
  'choral',
  'other'
);
CREATE TYPE credential_status AS ENUM ('pending', 'verified', 'rejected');
CREATE TYPE profile_completion_status AS ENUM ('incomplete', 'basic', 'complete');

-- User profiles table (extends auth.users)
CREATE TABLE public.user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  display_name TEXT,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'student',
  profile_completion profile_completion_status NOT NULL DEFAULT 'incomplete',
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  terms_accepted BOOLEAN NOT NULL DEFAULT FALSE,
  privacy_policy_accepted BOOLEAN NOT NULL DEFAULT FALSE,
  marketing_emails_consent BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  last_login_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,4}$'),
  CONSTRAINT valid_display_name CHECK (length(display_name) >= 2 AND length(display_name) <= 50)
);

-- Teacher profiles table
CREATE TABLE public.teacher_profiles (
  id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE PRIMARY KEY,
  bio TEXT,
  specializations teacher_specialization[] NOT NULL DEFAULT '{}',
  years_experience INTEGER,
  hourly_rate_min DECIMAL(10,2),
  hourly_rate_max DECIMAL(10,2),
  timezone TEXT DEFAULT 'UTC',
  languages TEXT[] DEFAULT '{"English"}',
  teaching_philosophy TEXT,
  availability_notes TEXT,
  credentials_verified BOOLEAN NOT NULL DEFAULT FALSE,
  public_profile BOOLEAN NOT NULL DEFAULT FALSE,
  accepts_new_students BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Constraints
  CONSTRAINT valid_experience CHECK (years_experience >= 0 AND years_experience <= 80),
  CONSTRAINT valid_rates CHECK (
    (hourly_rate_min IS NULL AND hourly_rate_max IS NULL) OR
    (hourly_rate_min >= 0 AND hourly_rate_max >= hourly_rate_min)
  ),
  CONSTRAINT has_specializations CHECK (array_length(specializations, 1) > 0)
);

-- Teacher credentials table
CREATE TABLE public.teacher_credentials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID REFERENCES public.teacher_profiles(id) ON DELETE CASCADE NOT NULL,
  credential_type TEXT NOT NULL, -- 'degree', 'certification', 'award', 'other'
  institution TEXT NOT NULL,
  credential_name TEXT NOT NULL,
  year_obtained INTEGER,
  document_url TEXT,
  verification_status credential_status NOT NULL DEFAULT 'pending',
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by UUID REFERENCES public.user_profiles(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  
  -- Constraints
  CONSTRAINT valid_year CHECK (year_obtained >= 1950 AND year_obtained <= EXTRACT(YEAR FROM NOW()) + 1)
);

-- Student profiles table
CREATE TABLE public.student_profiles (
  id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE PRIMARY KEY,
  age_range TEXT, -- '13-17', '18-24', '25-34', '35-44', '45-54', '55-64', '65+'
  experience_level TEXT NOT NULL DEFAULT 'beginner', -- 'beginner', 'intermediate', 'advanced'
  goals TEXT[] DEFAULT '{}',
  preferred_genres TEXT[] DEFAULT '{}',
  voice_type TEXT, -- 'soprano', 'alto', 'tenor', 'bass', etc.
  physical_limitations TEXT,
  accessibility_needs TEXT,
  learning_preferences TEXT[], -- 'visual', 'auditory', 'kinesthetic'
  practice_frequency TEXT, -- 'daily', 'several-times-week', 'weekly', 'occasionally'
  timezone TEXT DEFAULT 'UTC',
  
  -- Progress tracking
  lessons_completed INTEGER NOT NULL DEFAULT 0,
  practice_minutes_total INTEGER NOT NULL DEFAULT 0,
  last_practice_date DATE,
  skill_assessments JSONB DEFAULT '{}',
  
  -- Constraints
  CONSTRAINT valid_lessons CHECK (lessons_completed >= 0),
  CONSTRAINT valid_practice_minutes CHECK (practice_minutes_total >= 0)
);

-- User sessions table for tracking login sessions
CREATE TABLE public.user_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
  session_token TEXT NOT NULL,
  device_info TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  revoked_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT valid_expiry CHECK (expires_at > created_at)
);

-- Audit log for security tracking
CREATE TABLE public.auth_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  action TEXT NOT NULL, -- 'login', 'logout', 'register', 'password_change', 'profile_update'
  ip_address INET,
  user_agent TEXT,
  additional_data JSONB,
  success BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Add foreign key constraint as deferrable to avoid issues during user creation
ALTER TABLE public.auth_audit_log
ADD CONSTRAINT auth_audit_log_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)
ON DELETE SET NULL
DEFERRABLE INITIALLY DEFERRED;

-- Grant INSERT permissions to postgres role for trigger functions
GRANT INSERT ON public.user_profiles TO postgres;
GRANT INSERT ON public.teacher_profiles TO postgres;
GRANT INSERT ON public.student_profiles TO postgres;

-- Create indexes for performance
CREATE INDEX idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX idx_user_profiles_completion ON public.user_profiles(profile_completion);
CREATE INDEX idx_teacher_profiles_specializations ON public.teacher_profiles USING GIN(specializations);
CREATE INDEX idx_teacher_profiles_public ON public.teacher_profiles(public_profile) WHERE public_profile = true;
CREATE INDEX idx_teacher_credentials_teacher_id ON public.teacher_credentials(teacher_id);
CREATE INDEX idx_teacher_credentials_status ON public.teacher_credentials(verification_status);
CREATE INDEX idx_student_profiles_experience ON public.student_profiles(experience_level);
CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON public.user_sessions(session_token);
CREATE INDEX idx_user_sessions_expires ON public.user_sessions(expires_at);
CREATE INDEX idx_auth_audit_user_id ON public.auth_audit_log(user_id);
CREATE INDEX idx_auth_audit_action ON public.auth_audit_log(action);
CREATE INDEX idx_auth_audit_created ON public.auth_audit_log(created_at);

-- Enable Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Public profiles viewable by authenticated users" ON public.user_profiles
  FOR SELECT USING (
    auth.role() = 'authenticated' AND 
    (role = 'teacher' OR auth.uid() = id)
  );

-- RLS Policies for teacher_profiles
CREATE POLICY "Teachers can view own profile" ON public.teacher_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Teachers can update own profile" ON public.teacher_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Public teacher profiles viewable by all authenticated users" ON public.teacher_profiles
  FOR SELECT USING (
    auth.role() = 'authenticated' AND 
    (public_profile = true OR auth.uid() = id)
  );

-- RLS Policies for teacher_credentials
CREATE POLICY "Teachers can view own credentials" ON public.teacher_credentials
  FOR SELECT USING (
    auth.uid() = teacher_id OR 
    auth.uid() IN (
      SELECT id FROM public.user_profiles WHERE role = 'admin'
    )
  );

CREATE POLICY "Teachers can manage own credentials" ON public.teacher_credentials
  FOR ALL USING (auth.uid() = teacher_id);

-- RLS Policies for student_profiles
CREATE POLICY "Students can view own profile" ON public.student_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Students can update own profile" ON public.student_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Teachers can view student profiles of their students" ON public.student_profiles
  FOR SELECT USING (
    auth.uid() = id OR 
    auth.uid() IN (
      SELECT id FROM public.teacher_profiles WHERE id = auth.uid()
    )
  );

-- RLS Policies for user_sessions
CREATE POLICY "Users can view own sessions" ON public.user_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own sessions" ON public.user_sessions
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for auth_audit_log
CREATE POLICY "Users can view own audit log" ON public.auth_audit_log
  FOR SELECT USING (
    auth.uid() = user_id OR 
    auth.uid() IN (
      SELECT id FROM public.user_profiles WHERE role = 'admin'
    )
  );

CREATE POLICY "System can insert audit logs" ON public.auth_audit_log
  FOR INSERT WITH CHECK (true);

-- Functions for automatic timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER handle_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at();

-- Function to create user profile on auth signup (for email users only)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_provider TEXT;
BEGIN
  -- Get the authentication provider
  user_provider := COALESCE(NEW.raw_app_meta_data->>'provider', 'email');

  -- Only handle email users in this function
  IF user_provider = 'email' THEN
    INSERT INTO public.user_profiles (id, email, first_name, last_name)
    VALUES (
      NEW.id,
      NEW.email,
      NEW.raw_user_meta_data->>'first_name',
      NEW.raw_user_meta_data->>'last_name'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();

-- Function to log authentication events
CREATE OR REPLACE FUNCTION public.log_auth_event(
  p_user_id UUID,
  p_action TEXT,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_additional_data JSONB DEFAULT NULL,
  p_success BOOLEAN DEFAULT TRUE
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.auth_audit_log (
    user_id, action, ip_address, user_agent, additional_data, success
  ) VALUES (
    p_user_id, p_action, p_ip_address, p_user_agent, p_additional_data, p_success
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.user_sessions 
  WHERE expires_at < NOW() OR revoked_at IS NOT NULL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;