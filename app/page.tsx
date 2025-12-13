'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { hasCompletedOnboarding, isWithin30Minutes, updateLastLogin, getLastLogin } from '@/lib/auth-utils';

export default function RootPage() {
  const router = useRouter();
  const pathname = usePathname();

  // Handle browser back/forward navigation (swipe gestures)
  useEffect(() => {
    const handlePopState = () => {
      // When user swipes back, immediately check for last screen and redirect
      const lastScreen = typeof window !== 'undefined' 
        ? localStorage.getItem('seekeatz_current_screen')
        : null;
      
      if (lastScreen) {
        // Map screen names to routes
        const screenToRoute: Record<string, string> = {
          'home': '/home',
          'chat': '/chat',
          'log': '/home',
          'favorites': '/home',
          'settings': '/settings',
        };
        
        const targetRoute = screenToRoute[lastScreen];
        if (targetRoute && window.location.pathname !== targetRoute) {
          // Use replace to avoid adding to history stack
          router.replace(targetRoute);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [router]);

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      // Check if we're already on a valid app route - if so, don't redirect
      const validAppRoutes = ['/home', '/chat', '/settings'];
      const currentPath = pathname || (typeof window !== 'undefined' ? window.location.pathname : '');
      
      // If already on a valid app route, don't redirect - preserve current screen
      if (validAppRoutes.includes(currentPath)) {
        return;
      }
      
      // Also check if we're on auth or onboarding pages - don't redirect those
      if (currentPath.startsWith('/auth') || currentPath.startsWith('/onboarding')) {
        return;
      }

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // In development, always treat onboarding as not completed
        const isDev = process.env.NODE_ENV === "development";
        
        // Not authenticated - check if they've completed onboarding
        const onboardingCompleted = !isDev && typeof window !== 'undefined' 
          ? localStorage.getItem("onboardingCompleted") === "true" ||
            localStorage.getItem("hasCompletedOnboarding") === "true" ||
            localStorage.getItem("macroMatch_completedOnboarding") === "true"
          : false;
        
        if (!isDev && onboardingCompleted) {
          // Has completed onboarding but not authenticated - redirect to signin
          router.push('/auth/signin');
        } else {
          // New user - redirect to onboarding (or in dev, always show onboarding)
          router.push('/onboarding');
        }
        return;
      }

      // User is authenticated
      // In development, always treat onboarding as not completed
      const isDev = process.env.NODE_ENV === "development";
      const completed = isDev ? false : await hasCompletedOnboarding(user.id);
      
      // Check for last screen BEFORE checking onboarding completion
      // This prevents redirecting to onboarding when user swipes back
      // First check navigation history, then fallback to current screen
      let lastScreen: string | null = null;
      if (typeof window !== 'undefined') {
        const savedHistory = localStorage.getItem('seekeatz_nav_history');
        if (savedHistory) {
          try {
            const parsed = JSON.parse(savedHistory);
            if (Array.isArray(parsed) && parsed.length > 0) {
              lastScreen = parsed[parsed.length - 1];
            }
          } catch (e) {
            // Fall through
          }
        }
        if (!lastScreen) {
          lastScreen = localStorage.getItem('seekeatz_current_screen');
        }
      }
      
      if (!completed) {
        // Only redirect to onboarding if we're on root and have no last screen
        // This prevents redirecting when user swipes back from a valid screen
        if (currentPath === '/' && !lastScreen) {
          router.push('/onboarding');
        } else if (lastScreen && currentPath === '/') {
          // User has a last screen saved - redirect there instead of onboarding
          const screenToRoute: Record<string, string> = {
            'home': '/home',
            'chat': '/chat',
            'log': '/home',
            'favorites': '/home',
            'settings': '/settings',
          };
          const targetRoute = screenToRoute[lastScreen] || '/chat';
          router.replace(targetRoute);
        } else if (currentPath !== '/onboarding' && !currentPath.startsWith('/auth')) {
          router.push('/onboarding');
        }
        return;
      }

      // User is authenticated and has completed onboarding
      // Check if within 30 minutes (auto-login)
      // Also check if lastLogin was just set (user just signed in)
      const lastLogin = await getLastLogin(user.id);
      const now = Date.now();
      const THIRTY_MINUTES_MS = 30 * 60 * 1000;
      const within30Minutes = lastLogin ? (now - lastLogin) < THIRTY_MINUTES_MS : false;
      const justSignedIn = lastLogin ? (now - lastLogin) < 60000 : false; // Within last minute
      
      // Use the lastScreen variable already declared above, or get it from localStorage if not set
      if (!lastScreen && typeof window !== 'undefined') {
        lastScreen = localStorage.getItem('seekeatz_current_screen');
      }
      
      // Map screen names to routes
      const screenToRoute: Record<string, string> = {
        'home': '/home',
        'chat': '/chat',
        'log': '/home', // log doesn't have a route, use home
        'favorites': '/home', // favorites doesn't have a route, use home
        'settings': '/settings',
      };
      
      if (within30Minutes || justSignedIn) {
        // Within 30 minutes or just signed in - update lastLogin and go to last screen or default
        await updateLastLogin(user.id);
        
        // Update activity timestamp on successful login
        if (typeof window !== 'undefined') {
          localStorage.setItem('seekEatz_lastActivity', Date.now().toString());
        }
        
        // Only redirect if we're on the root page
        if (currentPath === '/' || !validAppRoutes.includes(currentPath)) {
          const targetRoute = lastScreen && screenToRoute[lastScreen] 
            ? screenToRoute[lastScreen]
            : '/chat'; // Default to chat
          
          router.push(targetRoute);
        }
      } else {
        // More than 30 minutes - session expired
        // Clear session-based UI state before requiring re-authentication
        if (typeof window !== 'undefined') {
          localStorage.removeItem('seekeatz_chat_messages');
          localStorage.removeItem('seekeatz_recommended_meals');
          localStorage.removeItem('seekeatz_has_searched');
          localStorage.removeItem('seekeatz_last_search_params');
          localStorage.removeItem('seekeatz_pending_chat_message');
        }
        
        // More than 30 minutes - but if they have a last screen saved, 
        // they might be swiping back, so preserve their last location
        // If we have a last screen and we're on root, they might be swiping back
        // In this case, redirect to signin but preserve the last screen for after login
        if (lastScreen && currentPath === '/') {
          // Save the intended destination
          if (typeof window !== 'undefined') {
            localStorage.setItem('seekeatz_intended_screen', lastScreen);
          }
        }
        
        // Require re-authentication
        // Only redirect if we're not already on auth pages
        if (!currentPath.startsWith('/auth')) {
          router.push('/auth/signin');
        }
      }
    };

    checkAuthAndRedirect();
  }, [router, pathname]);

  // Show loading state while checking
  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <div className="text-cyan-400 text-lg">Loading...</div>
    </div>
  );
}
