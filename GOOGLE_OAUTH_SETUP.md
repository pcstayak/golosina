# Google OAuth Setup Instructions

This document provides step-by-step instructions to configure Google OAuth authentication in your Golosina application.

## Overview

The Google OAuth integration has been implemented with the following components:
- `GoogleSignInButton` component with proper Google branding
- Integration with Supabase Auth for OAuth handling
- Support in both login and registration flows
- Proper callback handling for OAuth redirects
- User profile creation for new OAuth users

## Prerequisites

1. A Google Cloud Console account
2. A Supabase project with the correct URL and keys configured
3. Your application deployed or running locally with HTTPS (required for production OAuth)

## Step 1: Google Cloud Console Setup

### 1.1 Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API (or People API for newer projects)

### 1.2 Configure OAuth Consent Screen

1. Navigate to **APIs & Services** > **OAuth consent screen**
2. Choose **External** user type (unless you have a Google Workspace)
3. Fill in the required information:
   - **App name**: Golosina
   - **User support email**: Your support email
   - **Developer contact information**: Your contact email
4. Add your domain to **Authorized domains** (e.g., `yourdomain.com`)
5. Add the following scopes:
   - `email`
   - `profile` 
   - `openid`
6. Save and continue through the remaining steps

### 1.3 Create OAuth Credentials

1. Navigate to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. Choose **Web application** as the application type
4. Configure the following:
   - **Name**: Golosina Web Client
   - **Authorized JavaScript origins**:
     - `http://localhost:3000` (for development)
     - `https://yourdomain.com` (for production)
   - **Authorized redirect URIs**:
     - `https://cansvchorbzeqenctscc.supabase.co/auth/v1/callback` (replace with your Supabase project URL)

5. Click **Create** and copy the **Client ID** and **Client Secret**

## Step 2: Supabase Configuration

### 2.1 Enable Google OAuth Provider

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Authentication** > **Providers**
4. Find **Google** in the list and click to configure
5. Enable the Google provider
6. Enter your Google OAuth credentials:
   - **Client ID**: From Step 1.3
   - **Client Secret**: From Step 1.3
7. Click **Save**

### 2.2 Configure Redirect URLs

1. In the same **Providers** section, scroll to **Redirect URLs**
2. Add your application URLs:
   - `http://localhost:3000/auth/callback` (for development)
   - `https://yourdomain.com/auth/callback` (for production)
3. Click **Save**

### 2.3 Database Setup for OAuth Users

The application automatically handles OAuth users, but you may want to add a database trigger to create basic profiles for OAuth users. Here's an optional SQL function you can add:

```sql
-- Function to create basic profile for OAuth users
CREATE OR REPLACE FUNCTION handle_new_oauth_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create profile for OAuth users (non-email providers)
  IF NEW.raw_app_meta_data->>'provider' != 'email' THEN
    INSERT INTO user_profiles (
      id,
      email,
      first_name,
      last_name,
      display_name,
      role,
      profile_completion,
      onboarding_completed,
      terms_accepted,
      privacy_policy_accepted,
      marketing_emails_consent,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      'student', -- Default role, user can change later
      'incomplete', -- Needs to complete profile setup
      false, -- Needs onboarding
      false, -- Needs to accept terms
      false, -- Needs to accept privacy policy
      false, -- Default no marketing consent
      NOW(),
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function after user creation
CREATE TRIGGER on_auth_user_created_oauth
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_oauth_user();
```

## Step 3: Environment Variables

Ensure your `.env.local` file has the correct Supabase configuration:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

For production, update `NEXT_PUBLIC_SITE_URL` to your actual domain.

## Step 4: Testing the Integration

### 4.1 Development Testing

1. Start your development server: `npm run dev`
2. Navigate to your application
3. Click on sign-in/sign-up
4. Click "Continue with Google" or "Sign up with Google"
5. Complete the Google OAuth flow
6. Verify you're redirected back to your application

### 4.2 Production Testing

1. Deploy your application to your production domain
2. Ensure HTTPS is enabled
3. Test the OAuth flow in production
4. Verify all redirect URLs work correctly

## Troubleshooting

### Common Issues

1. **"redirect_uri_mismatch" error**
   - Verify redirect URIs in Google Cloud Console match exactly
   - Ensure Supabase redirect URLs are configured correctly

2. **"This app isn't verified" warning**
   - Normal for development - click "Advanced" and "Go to AppName"
   - For production, submit your app for verification in Google Cloud Console

3. **OAuth flow starts but user isn't logged in**
   - Check browser console for errors
   - Verify Supabase configuration
   - Ensure callback page is working correctly

4. **User created but no profile exists**
   - Add the database trigger from Step 2.3
   - Or handle profile creation in your application code

### Debug Information

The application logs useful information to the browser console during OAuth flow:
- OAuth user detection
- Profile creation status
- Redirect handling

Check the browser developer tools console for detailed error information.

## Security Considerations

1. **HTTPS Required**: Google OAuth requires HTTPS in production
2. **Domain Verification**: Verify ownership of domains used in OAuth configuration
3. **Client Secret Security**: Keep your Google Client Secret secure and never expose it in client-side code
4. **Supabase RLS**: Ensure Row Level Security policies are configured for user_profiles table

## Features Implemented

✅ Google OAuth sign-in button with proper Google branding  
✅ Integration with existing authentication flows  
✅ Support for both login and registration  
✅ Proper callback handling  
✅ OAuth user profile management  
✅ Error handling and user feedback  
✅ Loading states and UX improvements  

The Google OAuth integration is now ready for use in your Golosina application!