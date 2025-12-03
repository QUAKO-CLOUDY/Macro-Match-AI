import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Public routes
  const publicRoutes = ['/auth/signin', '/auth/signup']
  const onboardingRoutes = ['/onboarding', '/onboarding/start']
  const isPublicRoute = publicRoutes.includes(pathname)
  const isOnboardingRoute = onboardingRoutes.includes(pathname) || pathname.startsWith('/onboarding')

  // If user is not authenticated
  if (!user) {
    // Allow access to public routes and onboarding
    if (isPublicRoute || isOnboardingRoute) {
      return response
    }
    
    // Check localStorage for onboarding completion (client-side check will handle this)
    // For middleware, redirect to onboarding for unauthenticated users
    if (pathname !== '/onboarding' && !pathname.startsWith('/onboarding')) {
      const url = request.nextUrl.clone()
      url.pathname = '/onboarding'
      return NextResponse.redirect(url)
    }
    
    return response
  }

  // User is authenticated - check onboarding status
  let hasCompletedOnboarding = false
  
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('has_completed_onboarding, last_login')
      .eq('id', user.id)
      .single()

    // Only set to false if there's an actual error (not just missing profile)
    if (error && error.code !== 'PGRST116') {
      console.warn('Error fetching profile:', error)
    }
    
    hasCompletedOnboarding = profile?.has_completed_onboarding ?? false
    
    // Check if lastLogin is within 30 minutes (1800000 ms)
    if (profile?.last_login) {
      const lastLogin = new Date(profile.last_login).getTime()
      const now = Date.now()
      const thirtyMinutesAgo = now - (30 * 60 * 1000)
      
      if (lastLogin < thirtyMinutesAgo && !isOnboardingRoute && !isPublicRoute) {
        // Last login was more than 30 minutes ago - require re-authentication
        const url = request.nextUrl.clone()
        url.pathname = '/auth/signin'
        return NextResponse.redirect(url)
      }
    }
  } catch (error) {
    // Profiles table might not exist yet - allow through and let client-side handle it
    // This prevents redirect loops when profile is being created
    console.warn('Error checking profile, allowing access:', error)
    hasCompletedOnboarding = false
  }

  // Main app routes that authenticated users should be able to access
  const mainAppRoutes = ['/home', '/chat']
  const isMainAppRoute = mainAppRoutes.includes(pathname)

  // If user has completed onboarding and tries to access onboarding, redirect to chat
  if (hasCompletedOnboarding && isOnboardingRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/chat'
    return NextResponse.redirect(url)
  }

  // Allow authenticated users to access main app routes even if onboarding check fails
  // This prevents redirect loops when onboarding is being completed
  if (isMainAppRoute) {
    return response
  }

  // If user hasn't completed onboarding and accessing other protected routes, redirect to onboarding
  if (!hasCompletedOnboarding && !isOnboardingRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/onboarding'
    return NextResponse.redirect(url)
  }

  // User is authenticated and has completed onboarding
  // Redirect root to chat (AI chatbot)
  if (pathname === '/') {
    const url = request.nextUrl.clone()
    url.pathname = '/chat'
    return NextResponse.redirect(url)
  }

  // Allow access to main app routes
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
