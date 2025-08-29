import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'

export async function GET(request: NextRequest) {
  // For Supabase auth callbacks, tokens come in URL fragment which isn't accessible server-side
  // Redirect to client-side handler that can process the fragment
  return NextResponse.redirect(new URL('/auth/callback', request.url))
}

export async function POST(request: NextRequest) {
  if (!supabase) {
    console.error('Supabase not configured')
    return NextResponse.json({ error: 'configuration_error' }, { status: 500 })
  }

  try {
    const body = await request.json()
    const { access_token, refresh_token, type } = body

    // Validate required parameters
    if (!access_token) {
      console.error('Missing access_token')
      return NextResponse.json({ error: 'invalid_token' }, { status: 400 })
    }

    // Set the session using the tokens from the callback
    const { data: { user }, error } = await supabase.auth.setSession({
      access_token: access_token,
      refresh_token: refresh_token || '',
    })

    if (error) {
      console.error('Error setting session:', error)
      return NextResponse.json({ error: 'authentication_failed' }, { status: 400 })
    }

    if (!user) {
      console.error('No user returned from setSession')
      return NextResponse.json({ error: 'user_not_found' }, { status: 400 })
    }

    // Return success with redirect URL based on callback type
    let redirectUrl = '/'
    switch (type) {
      case 'signup':
        redirectUrl = `/auth/verify-email?verified=true&user_id=${user.id}`
        break
      case 'recovery':
        redirectUrl = '/auth/reset-password'
        break
    }

    return NextResponse.json({ 
      success: true, 
      user: user,
      redirectUrl: redirectUrl
    })

  } catch (error) {
    console.error('Callback handler error:', error)
    return NextResponse.json({ error: 'unexpected_error' }, { status: 500 })
  }
}