'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { hasCompletedOnboarding, isWithin30Minutes, updateLastLogin } from '@/lib/auth-utils';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // Not authenticated - check if they've completed onboarding questions
        const questionsComplete = typeof window !== 'undefined' 
          ? localStorage.getItem("macroMatch_onboardingQuestionsComplete") === "true"
          : false;
        
        const onboardingComplete = typeof window !== 'undefined' 
          ? localStorage.getItem("hasCompletedOnboarding") === "true" ||
            localStorage.getItem("macroMatch_completedOnboarding") === "true"
          : false;
        
        if (onboardingComplete) {
          // Has completed onboarding but not authenticated - redirect to signin
          router.push('/auth/signin');
        } else if (questionsComplete) {
          // Has completed onboarding questions but not created account - redirect to signup
          router.push('/auth/signup');
        } else {
          // New user - redirect to onboarding
          router.push('/onboarding');
        }
        return;
      }

      // User is authenticated
      const completed = await hasCompletedOnboarding(user.id);
      
      if (!completed) {
        // Authenticated but hasn't completed onboarding - redirect to onboarding
        // Don't redirect if they're already on onboarding or auth pages
        router.push('/onboarding');
        return;
      }

      // User is authenticated and has completed onboarding
      // Check if within 30 minutes (auto-login)
      const within30Minutes = await isWithin30Minutes(user.id);
      if (within30Minutes) {
        // Within 30 minutes - update lastLogin and go to home
        await updateLastLogin(user.id);
        router.push('/chat');
      } else {
        // More than 30 minutes - require re-authentication
        router.push('/auth/signin');
      }
    };

    checkAuthAndRedirect();
  }, [router]);

  // Show loading state while checking
  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <div className="text-cyan-400 text-lg">Loading...</div>
    </div>
  );
}
