-- Cleanup script for Supabase test data
-- Run this in Supabase SQL Editor to clean up conflicting data

-- First, disable triggers temporarily to avoid cascade issues
SET session_replication_role = replica;

-- Clean up audit logs (safe to delete all test data)
DELETE FROM public.auth_audit_log;

-- Clean up user sessions
DELETE FROM public.user_sessions;

-- Clean up student profiles
DELETE FROM public.student_profiles;

-- Clean up teacher credentials
DELETE FROM public.teacher_credentials;

-- Clean up teacher profiles  
DELETE FROM public.teacher_profiles;

-- Clean up user profiles
DELETE FROM public.user_profiles;

-- Re-enable triggers
SET session_replication_role = DEFAULT;

-- Clean up auth.users (this will cascade delete everything)
-- WARNING: This removes ALL users including you!
-- Uncomment the line below ONLY if you want to delete all users:
 DELETE FROM auth.users;

-- Reset sequences if needed
 SELECT setval(pg_get_serial_sequence('auth.users', 'id'), 1, false);

-- Verify cleanup
SELECT 'user_profiles' as table_name, count(*) as remaining_rows FROM public.user_profiles
UNION ALL
SELECT 'teacher_profiles', count(*) FROM public.teacher_profiles  
UNION ALL
SELECT 'student_profiles', count(*) FROM public.student_profiles
UNION ALL
SELECT 'auth_audit_log', count(*) FROM public.auth_audit_log
UNION ALL
SELECT 'user_sessions', count(*) FROM public.user_sessions
UNION ALL
SELECT 'auth.users', count(*) FROM auth.users;